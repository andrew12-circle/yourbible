import Foundation

enum JournalVideoCaptureState: String, Codable {
    case preparing
    case preview
    case recording
    case paused
    case interrupted
    case finalizing
    case pendingHandoff
    case failed

    var canResume: Bool {
        switch self {
        case .preview, .paused, .interrupted, .failed:
            return true
        case .preparing, .recording, .finalizing, .pendingHandoff:
            return false
        }
    }

}

struct JournalVideoCapturePart: Codable, Equatable {
    var fileName: String
    var createdAt: Date
    var durationMs: Int64
    var bytes: Int64
}

struct JournalVideoCaptureManifest: Codable {
    static let currentSchemaVersion = 1

    var schemaVersion: Int
    var sessionId: String
    var userId: String
    var entryId: String
    var anchorOffset: Int
    var teleprompter: String
    var state: JournalVideoCaptureState
    var createdAt: Date
    var updatedAt: Date
    var durationMs: Int64
    var bytes: Int64
    var maxDurationMs: Int64
    var maxBytes: Int64
    var parts: [JournalVideoCapturePart]
    var activeFileName: String?
    var finalFileName: String?
    var mimeType: String?
    var captureOrientation: String?
    var interruptionReason: String?
    var errorMessage: String?

    init(
        sessionId: String,
        userId: String,
        entryId: String,
        anchorOffset: Int,
        teleprompter: String,
        maxDurationMs: Int64,
        maxBytes: Int64,
        now: Date = Date()
    ) {
        schemaVersion = Self.currentSchemaVersion
        self.sessionId = sessionId
        self.userId = userId
        self.entryId = entryId
        self.anchorOffset = anchorOffset
        self.teleprompter = teleprompter
        state = .preparing
        createdAt = now
        updatedAt = now
        durationMs = 0
        bytes = 0
        self.maxDurationMs = maxDurationMs
        self.maxBytes = maxBytes
        parts = []
        activeFileName = nil
        finalFileName = nil
        mimeType = nil
        captureOrientation = nil
        interruptionReason = nil
        errorMessage = nil
    }

    var committedDurationMs: Int64 {
        parts.reduce(0) { $0 + $1.durationMs }
    }

    var committedBytes: Int64 {
        parts.reduce(0) { $0 + $1.bytes }
    }

    func stateDictionary() -> [String: Any] {
        var value: [String: Any] = [
            "sessionId": sessionId,
            "state": state.rawValue,
            "userId": userId,
            "durationMs": durationMs,
            "bytes": bytes,
            "createdAt": JournalVideoDates.string(from: createdAt),
            "updatedAt": JournalVideoDates.string(from: updatedAt),
            "entryId": entryId,
            "anchorOffset": anchorOffset,
            "canResume": state.canResume && bytes > 0,
            "hasPendingResult": finalFileName != nil
        ]
        if let reason = interruptionReason { value["interruptionReason"] = reason }
        if let error = errorMessage { value["error"] = error }
        return value
    }
}

struct JournalVideoCaptureStartOptions {
    let sessionId: String
    let userId: String
    let entryId: String
    let anchorOffset: Int
    let teleprompter: String
    let maxDurationMs: Int64
    let maxBytes: Int64
}

struct JournalVideoPendingResult {
    let sessionId: String
    let userId: String
    let state: JournalVideoCaptureState
    let fileURL: URL
    let mimeType: String
    let durationMs: Int64
    let bytes: Int64
    let createdAt: Date
    let entryId: String
    let anchorOffset: Int

    func dictionary() -> [String: Any] {
        [
            "sessionId": sessionId,
            "state": state.rawValue,
            "userId": userId,
            "fileUrl": fileURL.absoluteString,
            "mimeType": mimeType,
            "durationMs": durationMs,
            "bytes": bytes,
            "createdAt": JournalVideoDates.string(from: createdAt),
            "entryId": entryId,
            "anchorOffset": anchorOffset
        ]
    }
}

enum JournalVideoCaptureError: LocalizedError {
    case invalidSessionId
    case sessionAlreadyExists
    case sessionNotFound
    case recorderBusy
    case invalidState(String)
    case permissionDenied(String)
    case captureUnavailable(String)
    case noRecordedMedia
    case pendingResultUnavailable
    case fileTooLarge

    var errorDescription: String? {
        switch self {
        case .invalidSessionId:
            return "The journal video session id is invalid."
        case .sessionAlreadyExists:
            return "A journal video session with this id already exists."
        case .sessionNotFound:
            return "The journal video session could not be found."
        case .recorderBusy:
            return "Another journal video recorder is already open."
        case .invalidState(let message):
            return message
        case .permissionDenied(let media):
            return "\(media) permission is required to record a journal video."
        case .captureUnavailable(let message):
            return message
        case .noRecordedMedia:
            return "No usable journal video was recorded."
        case .pendingResultUnavailable:
            return "This journal video is not ready for handoff yet."
        case .fileTooLarge:
            return "The journal video exceeded the 48 MB handoff limit."
        }
    }
}

enum JournalVideoLimits {
    static let hardDurationMs: Int64 = 30 * 60 * 1_000
    static let recordingBytes: Int64 = 46 * 1_024 * 1_024
    static let handoffBytes: Int64 = 48 * 1_024 * 1_024
    static let minimumDurationMs: Int64 = 1_000
    static let minimumBytes: Int64 = 1_024
}

enum JournalVideoDates {
    private static let formatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    static func string(from date: Date) -> String {
        formatter.string(from: date)
    }
}
