import AVFoundation
import Foundation

final class JournalVideoCaptureStore {
    private let fileManager: FileManager
    private let queue = DispatchQueue(label: "com.holypark.journal-video.store")
    private let rootURL: URL
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    init(fileManager: FileManager = .default) throws {
        self.fileManager = fileManager
        guard let applicationSupport = fileManager.urls(
            for: .applicationSupportDirectory,
            in: .userDomainMask
        ).first else {
            throw JournalVideoCaptureError.captureUnavailable(
                "Application Support is unavailable for journal video recovery."
            )
        }
        rootURL = applicationSupport.appendingPathComponent(
            "JournalVideoCaptures",
            isDirectory: true
        )
        encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        try Self.createProtectedDirectory(rootURL, fileManager: fileManager)
        try Self.excludeFromBackup(rootURL)
        try queue.sync { try recoverInterruptedCapturesUnlocked() }
    }

    func create(options: JournalVideoCaptureStartOptions) throws -> JournalVideoCaptureManifest {
        try queue.sync {
            guard Self.isValidSessionId(options.sessionId) else {
                throw JournalVideoCaptureError.invalidSessionId
            }
            let directory = sessionDirectoryUnlocked(options.sessionId)
            guard !fileManager.fileExists(atPath: directory.path) else {
                throw JournalVideoCaptureError.sessionAlreadyExists
            }
            try Self.createProtectedDirectory(directory, fileManager: fileManager)
            try Self.excludeFromBackup(directory)
            let manifest = JournalVideoCaptureManifest(
                sessionId: options.sessionId,
                userId: options.userId,
                entryId: options.entryId,
                anchorOffset: options.anchorOffset,
                teleprompter: options.teleprompter,
                maxDurationMs: options.maxDurationMs,
                maxBytes: options.maxBytes
            )
            try writeUnlocked(manifest)
            return manifest
        }
    }

    func manifest(sessionId: String) throws -> JournalVideoCaptureManifest {
        try queue.sync { try loadUnlocked(sessionId) }
    }

    func update(
        sessionId: String,
        _ mutation: (inout JournalVideoCaptureManifest) throws -> Void
    ) throws -> JournalVideoCaptureManifest {
        try queue.sync {
            var manifest = try loadUnlocked(sessionId)
            try mutation(&manifest)
            manifest.updatedAt = Date()
            try writeUnlocked(manifest)
            return manifest
        }
    }

    func listRecoverable() -> [JournalVideoCaptureManifest] {
        queue.sync {
            allManifestsUnlocked()
                .filter { manifest in
                    manifest.bytes > 0 || manifest.finalFileName != nil || !manifest.parts.isEmpty
                }
                .sorted { $0.updatedAt > $1.updatedAt }
        }
    }

    func allocateActivePart(sessionId: String) throws -> URL {
        try queue.sync {
            var manifest = try loadUnlocked(sessionId)
            guard manifest.activeFileName == nil else {
                throw JournalVideoCaptureError.invalidState(
                    "The journal video already has an active recording file."
                )
            }
            let sequence = manifest.parts.count + 1
            let fileName = String(format: "part-%03d-%@.partial.mov", sequence, UUID().uuidString)
            manifest.activeFileName = fileName
            manifest.updatedAt = Date()
            try writeUnlocked(manifest)
            return sessionDirectoryUnlocked(sessionId).appendingPathComponent(fileName)
        }
    }

    @discardableResult
    func commitActivePart(sessionId: String) throws -> JournalVideoCaptureManifest {
        try queue.sync {
            var manifest = try loadUnlocked(sessionId)
            try promoteActivePartUnlocked(&manifest)
            manifest.updatedAt = Date()
            try writeUnlocked(manifest)
            return manifest
        }
    }

    func partURLs(sessionId: String) throws -> [URL] {
        try queue.sync {
            let manifest = try loadUnlocked(sessionId)
            let directory = sessionDirectoryUnlocked(sessionId)
            return manifest.parts.map { directory.appendingPathComponent($0.fileName) }
        }
    }

    func finalOutputURL(sessionId: String, extension fileExtension: String) throws -> URL {
        try queue.sync {
            _ = try loadUnlocked(sessionId)
            return sessionDirectoryUnlocked(sessionId)
                .appendingPathComponent("final.partial.\(fileExtension)")
        }
    }

    @discardableResult
    func commitFinalResult(
        sessionId: String,
        temporaryURL: URL,
        mimeType: String
    ) throws -> JournalVideoCaptureManifest {
        try queue.sync {
            var manifest = try loadUnlocked(sessionId)
            let fileExtension = mimeType == "video/mp4" ? "mp4" : "mov"
            let finalName = "journal-video.\(fileExtension)"
            let finalURL = sessionDirectoryUnlocked(sessionId).appendingPathComponent(finalName)
            let temporaryValues = try temporaryURL.resourceValues(forKeys: [.fileSizeKey])
            let bytes = Int64(temporaryValues.fileSize ?? 0)
            guard bytes > 0, Self.isPlayableMedia(at: temporaryURL) else {
                throw JournalVideoCaptureError.noRecordedMedia
            }
            guard bytes <= JournalVideoLimits.handoffBytes else {
                throw JournalVideoCaptureError.fileTooLarge
            }
            let media = Self.mediaInfo(at: temporaryURL)
            if fileManager.fileExists(atPath: finalURL.path) {
                try fileManager.removeItem(at: finalURL)
            }
            try fileManager.moveItem(at: temporaryURL, to: finalURL)
            try Self.protectFile(finalURL, fileManager: fileManager)
            try Self.excludeFromBackup(finalURL)
            manifest.finalFileName = finalName
            manifest.mimeType = mimeType
            manifest.durationMs = max(manifest.committedDurationMs, media.durationMs)
            manifest.bytes = bytes
            manifest.state = .pendingHandoff
            manifest.activeFileName = nil
            manifest.interruptionReason = nil
            manifest.errorMessage = nil
            manifest.updatedAt = Date()
            try writeUnlocked(manifest)
            return manifest
        }
    }

    func pendingResult(sessionId: String) throws -> JournalVideoPendingResult {
        try queue.sync {
            let manifest = try loadUnlocked(sessionId)
            guard manifest.state == .pendingHandoff,
                  let fileName = manifest.finalFileName,
                  let mimeType = manifest.mimeType else {
                throw JournalVideoCaptureError.pendingResultUnavailable
            }
            let fileURL = sessionDirectoryUnlocked(sessionId).appendingPathComponent(fileName)
            guard fileManager.fileExists(atPath: fileURL.path),
                  Self.isPlayableMedia(at: fileURL) else {
                throw JournalVideoCaptureError.pendingResultUnavailable
            }
            return JournalVideoPendingResult(
                sessionId: manifest.sessionId,
                userId: manifest.userId,
                state: manifest.state,
                fileURL: fileURL,
                mimeType: mimeType,
                durationMs: manifest.durationMs,
                bytes: manifest.bytes,
                createdAt: manifest.createdAt,
                entryId: manifest.entryId,
                anchorOffset: manifest.anchorOffset
            )
        }
    }

    func prepareForResume(sessionId: String) throws -> JournalVideoCaptureManifest {
        try queue.sync {
            var manifest = try loadUnlocked(sessionId)
            guard manifest.state != .pendingHandoff else {
                throw JournalVideoCaptureError.invalidState(
                    "This journal video is already ready for handoff."
                )
            }
            if let finalName = manifest.finalFileName {
                let finalURL = sessionDirectoryUnlocked(sessionId).appendingPathComponent(finalName)
                try? fileManager.removeItem(at: finalURL)
            }
            manifest.finalFileName = nil
            manifest.mimeType = nil
            manifest.state = .preparing
            manifest.errorMessage = nil
            manifest.updatedAt = Date()
            try writeUnlocked(manifest)
            return manifest
        }
    }

    func delete(sessionId: String) throws {
        try queue.sync {
            guard Self.isValidSessionId(sessionId) else {
                throw JournalVideoCaptureError.invalidSessionId
            }
            let directory = sessionDirectoryUnlocked(sessionId)
            guard fileManager.fileExists(atPath: directory.path) else {
                throw JournalVideoCaptureError.sessionNotFound
            }
            try fileManager.removeItem(at: directory)
        }
    }

    private func allManifestsUnlocked() -> [JournalVideoCaptureManifest] {
        guard let directories = try? fileManager.contentsOfDirectory(
            at: rootURL,
            includingPropertiesForKeys: [.isDirectoryKey],
            options: [.skipsHiddenFiles]
        ) else { return [] }
        return directories.compactMap { directory in
            guard (try? directory.resourceValues(forKeys: [.isDirectoryKey]).isDirectory) == true else {
                return nil
            }
            return try? loadUnlocked(directory.lastPathComponent)
        }
    }

    private func recoverInterruptedCapturesUnlocked() throws {
        for original in allManifestsUnlocked() {
            var manifest = original
            let directory = sessionDirectoryUnlocked(manifest.sessionId)

            if let finalName = manifest.finalFileName {
                let finalURL = directory.appendingPathComponent(finalName)
                if fileManager.fileExists(atPath: finalURL.path), Self.isPlayableMedia(at: finalURL) {
                    let info = Self.mediaInfo(at: finalURL)
                    manifest.state = .pendingHandoff
                    manifest.durationMs = max(manifest.durationMs, info.durationMs)
                    manifest.bytes = info.bytes
                    manifest.errorMessage = nil
                    manifest.updatedAt = Date()
                    try writeUnlocked(manifest)
                    continue
                }
                manifest.finalFileName = nil
                manifest.mimeType = nil
            }

            if manifest.activeFileName != nil {
                try promoteActivePartUnlocked(&manifest)
            }

            switch manifest.state {
            case .recording, .preparing, .preview, .paused, .finalizing:
                if !manifest.parts.isEmpty {
                    manifest.state = .interrupted
                    manifest.interruptionReason =
                        "The app closed before recording finished. Your saved portion is recoverable."
                    manifest.errorMessage = nil
                } else {
                    manifest.state = .failed
                    manifest.errorMessage = "No playable video fragment was recovered."
                }
            case .interrupted, .failed, .pendingHandoff:
                break
            }
            manifest.durationMs = manifest.committedDurationMs
            manifest.bytes = manifest.committedBytes
            manifest.updatedAt = Date()
            try writeUnlocked(manifest)
        }
    }

    private func promoteActivePartUnlocked(_ manifest: inout JournalVideoCaptureManifest) throws {
        guard let activeName = manifest.activeFileName else { return }
        let directory = sessionDirectoryUnlocked(manifest.sessionId)
        let activeURL = directory.appendingPathComponent(activeName)
        defer { manifest.activeFileName = nil }
        guard fileManager.fileExists(atPath: activeURL.path) else { return }

        guard Self.isPlayableMedia(at: activeURL) else {
            let unusableURL = directory.appendingPathComponent(
                "unusable-\(UUID().uuidString).partial.mov"
            )
            try? fileManager.moveItem(at: activeURL, to: unusableURL)
            return
        }

        let info = Self.mediaInfo(at: activeURL)
        let sequence = manifest.parts.count + 1
        let committedName = String(format: "part-%03d.mov", sequence)
        let committedURL = directory.appendingPathComponent(committedName)
        if fileManager.fileExists(atPath: committedURL.path) {
            try fileManager.removeItem(at: committedURL)
        }
        try fileManager.moveItem(at: activeURL, to: committedURL)
        try Self.protectFile(committedURL, fileManager: fileManager)
        try Self.excludeFromBackup(committedURL)
        manifest.parts.append(
            JournalVideoCapturePart(
                fileName: committedName,
                createdAt: Date(),
                durationMs: info.durationMs,
                bytes: info.bytes
            )
        )
        manifest.durationMs = manifest.committedDurationMs
        manifest.bytes = manifest.committedBytes
    }

    private func loadUnlocked(_ sessionId: String) throws -> JournalVideoCaptureManifest {
        guard Self.isValidSessionId(sessionId) else {
            throw JournalVideoCaptureError.invalidSessionId
        }
        let data = try Data(contentsOf: manifestURLUnlocked(sessionId))
        return try decoder.decode(JournalVideoCaptureManifest.self, from: data)
    }

    private func writeUnlocked(_ manifest: JournalVideoCaptureManifest) throws {
        let data = try encoder.encode(manifest)
        let url = manifestURLUnlocked(manifest.sessionId)
        try data.write(to: url, options: [.atomic])
        try Self.protectFile(url, fileManager: fileManager)
        try Self.excludeFromBackup(url)
    }

    private func manifestURLUnlocked(_ sessionId: String) -> URL {
        sessionDirectoryUnlocked(sessionId).appendingPathComponent("manifest.json")
    }

    private func sessionDirectoryUnlocked(_ sessionId: String) -> URL {
        rootURL.appendingPathComponent(sessionId, isDirectory: true)
    }

    private static func mediaInfo(at url: URL) -> (durationMs: Int64, bytes: Int64) {
        let asset = AVURLAsset(url: url)
        let seconds = CMTimeGetSeconds(asset.duration)
        let durationMs = seconds.isFinite && seconds > 0
            ? Int64((seconds * 1_000).rounded())
            : 0
        let values = try? url.resourceValues(forKeys: [.fileSizeKey])
        return (durationMs, Int64(values?.fileSize ?? 0))
    }

    private static func isPlayableMedia(at url: URL) -> Bool {
        guard let values = try? url.resourceValues(forKeys: [.fileSizeKey]),
              (values.fileSize ?? 0) > 0 else { return false }
        let asset = AVURLAsset(url: url)
        let seconds = CMTimeGetSeconds(asset.duration)
        let hasVideo = !asset.tracks(withMediaType: .video).isEmpty
        return hasVideo && seconds.isFinite && seconds > 0
    }

    private static func isValidSessionId(_ value: String) -> Bool {
        guard !value.isEmpty, value.count <= 128 else { return false }
        let allowed = CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_")
        return value.unicodeScalars.allSatisfy { allowed.contains($0) }
    }

    private static func createProtectedDirectory(_ url: URL, fileManager: FileManager) throws {
        try fileManager.createDirectory(
            at: url,
            withIntermediateDirectories: true,
            attributes: [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication]
        )
    }

    private static func protectFile(_ url: URL, fileManager: FileManager) throws {
        try fileManager.setAttributes(
            [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication],
            ofItemAtPath: url.path
        )
    }

    private static func excludeFromBackup(_ url: URL) throws {
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        var mutableURL = url
        try mutableURL.setResourceValues(values)
    }
}
