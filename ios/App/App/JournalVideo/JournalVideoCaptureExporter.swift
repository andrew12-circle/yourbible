import AVFoundation
import Foundation

final class JournalVideoCaptureExporter {
    private let store: JournalVideoCaptureStore
    private let queue = DispatchQueue(label: "com.holypark.journal-video.export", qos: .userInitiated)

    init(store: JournalVideoCaptureStore) {
        self.store = store
    }

    func export(
        sessionId: String,
        completion: @escaping (Result<JournalVideoCaptureManifest, Error>) -> Void
    ) {
        queue.async { [weak self] in
            guard let self = self else { return }
            do {
                let partURLs = try self.store.partURLs(sessionId: sessionId)
                guard !partURLs.isEmpty else { throw JournalVideoCaptureError.noRecordedMedia }
                let source = try self.buildSource(from: partURLs)
                self.tryExport(
                    source: source,
                    sessionId: sessionId,
                    attempts: [
                        ExportAttempt(preset: AVAssetExportPresetPassthrough, fileType: .mp4),
                        ExportAttempt(preset: AVAssetExportPresetPassthrough, fileType: .mov),
                        ExportAttempt(preset: AVAssetExportPresetLowQuality, fileType: .mp4)
                    ],
                    partURLs: partURLs,
                    completion: completion
                )
            } catch {
                completion(.failure(error))
            }
        }
    }

    private func buildSource(from urls: [URL]) throws -> AVAsset {
        let assets = urls.map { AVURLAsset(url: $0) }
        if assets.count == 1 { return assets[0] }

        let composition = AVMutableComposition()
        guard let videoTrack = composition.addMutableTrack(
            withMediaType: .video,
            preferredTrackID: kCMPersistentTrackID_Invalid
        ) else {
            throw JournalVideoCaptureError.captureUnavailable(
                "The recovered journal video could not create a video track."
            )
        }
        let audioTrack = composition.addMutableTrack(
            withMediaType: .audio,
            preferredTrackID: kCMPersistentTrackID_Invalid
        )
        var cursor = CMTime.zero
        var appliedTransform = false

        for asset in assets {
            let duration = asset.duration
            let durationSeconds = CMTimeGetSeconds(duration)
            guard duration.isValid, durationSeconds.isFinite, durationSeconds > 0,
                  let sourceVideo = asset.tracks(withMediaType: .video).first else {
                throw JournalVideoCaptureError.noRecordedMedia
            }
            let range = CMTimeRange(start: .zero, duration: duration)
            try videoTrack.insertTimeRange(range, of: sourceVideo, at: cursor)
            if !appliedTransform {
                videoTrack.preferredTransform = sourceVideo.preferredTransform
                appliedTransform = true
            }
            if let sourceAudio = asset.tracks(withMediaType: .audio).first {
                try audioTrack?.insertTimeRange(range, of: sourceAudio, at: cursor)
            }
            cursor = CMTimeAdd(cursor, duration)
        }
        return composition
    }

    private func tryExport(
        source: AVAsset,
        sessionId: String,
        attempts: [ExportAttempt],
        partURLs: [URL],
        completion: @escaping (Result<JournalVideoCaptureManifest, Error>) -> Void
    ) {
        guard let attempt = attempts.first else {
            if partURLs.count == 1 {
                do {
                    let manifest = try copyValidatedMovFallback(
                        partURL: partURLs[0],
                        sessionId: sessionId
                    )
                    completion(.success(manifest))
                } catch {
                    completion(.failure(error))
                }
            } else {
                completion(.failure(JournalVideoCaptureError.captureUnavailable(
                    "The recovered journal video segments could not be combined."
                )))
            }
            return
        }

        guard let exporter = AVAssetExportSession(asset: source, presetName: attempt.preset),
              exporter.supportedFileTypes.contains(attempt.fileType) else {
            tryExport(
                source: source,
                sessionId: sessionId,
                attempts: Array(attempts.dropFirst()),
                partURLs: partURLs,
                completion: completion
            )
            return
        }

        do {
            let fileExtension = attempt.fileType == .mp4 ? "mp4" : "mov"
            let outputURL = try store.finalOutputURL(
                sessionId: sessionId,
                extension: fileExtension
            )
            try? FileManager.default.removeItem(at: outputURL)
            exporter.outputURL = outputURL
            exporter.outputFileType = attempt.fileType
            exporter.shouldOptimizeForNetworkUse = true
            exporter.exportAsynchronously { [weak self] in
                guard let self = self else { return }
                self.queue.async {
                    if exporter.status == .completed {
                        do {
                            let mimeType = attempt.fileType == .mp4 ? "video/mp4" : "video/quicktime"
                            let manifest = try self.store.commitFinalResult(
                                sessionId: sessionId,
                                temporaryURL: outputURL,
                                mimeType: mimeType
                            )
                            completion(.success(manifest))
                        } catch {
                            try? FileManager.default.removeItem(at: outputURL)
                            if let captureError = error as? JournalVideoCaptureError,
                               case .fileTooLarge = captureError {
                                self.tryExport(
                                    source: source,
                                    sessionId: sessionId,
                                    attempts: Array(attempts.dropFirst()),
                                    partURLs: partURLs,
                                    completion: completion
                                )
                            } else {
                                completion(.failure(error))
                            }
                        }
                        return
                    }
                    try? FileManager.default.removeItem(at: outputURL)
                    self.tryExport(
                        source: source,
                        sessionId: sessionId,
                        attempts: Array(attempts.dropFirst()),
                        partURLs: partURLs,
                        completion: completion
                    )
                }
            }
        } catch {
            completion(.failure(error))
        }
    }

    private func copyValidatedMovFallback(
        partURL: URL,
        sessionId: String
    ) throws -> JournalVideoCaptureManifest {
        let sourceAsset = AVURLAsset(url: partURL)
        let seconds = CMTimeGetSeconds(sourceAsset.duration)
        guard !sourceAsset.tracks(withMediaType: .video).isEmpty,
              seconds.isFinite, seconds > 0 else {
            throw JournalVideoCaptureError.noRecordedMedia
        }
        let temporaryURL = try store.finalOutputURL(sessionId: sessionId, extension: "mov")
        try? FileManager.default.removeItem(at: temporaryURL)
        try FileManager.default.copyItem(at: partURL, to: temporaryURL)
        return try store.commitFinalResult(
            sessionId: sessionId,
            temporaryURL: temporaryURL,
            mimeType: "video/quicktime"
        )
    }
}

private struct ExportAttempt {
    let preset: String
    let fileType: AVFileType
}
