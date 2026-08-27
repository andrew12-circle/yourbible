import AVFoundation
import UIKit

protocol JournalVideoRecorderViewControllerDelegate: AnyObject {
    func journalVideoRecorderDidRequestRecord(_ controller: JournalVideoRecorderViewController)
    func journalVideoRecorderDidRequestPause(_ controller: JournalVideoRecorderViewController)
    func journalVideoRecorderDidRequestSave(_ controller: JournalVideoRecorderViewController)
    func journalVideoRecorderDidRequestKeepDraft(_ controller: JournalVideoRecorderViewController)
    func journalVideoRecorderDidRequestDiscard(_ controller: JournalVideoRecorderViewController)
    func journalVideoRecorderDidRequestCameraSwitch(_ controller: JournalVideoRecorderViewController)
    func journalVideoRecorder(
        _ controller: JournalVideoRecorderViewController,
        didChange orientation: UIInterfaceOrientation
    )
}

final class JournalVideoPreviewView: UIView {
    override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }

    var previewLayer: AVCaptureVideoPreviewLayer {
        layer as! AVCaptureVideoPreviewLayer
    }
}

final class JournalVideoRecorderViewController: UIViewController {
    weak var delegate: JournalVideoRecorderViewControllerDelegate?

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

    private let previewView = JournalVideoPreviewView()
    private let closeButton = UIButton(type: .system)
    private let switchButton = UIButton(type: .system)
    private let clockLabel = UILabel()
    private let sizeLabel = UILabel()
    private let statusLabel = UILabel()
    private let teleprompterView = UITextView()
    private let primaryButton = UIButton(type: .system)
    private let saveButton = UIButton(type: .system)
    private let spinner = UIActivityIndicatorView(style: .large)
    private var manifest: JournalVideoCaptureManifest

    init(manifest: JournalVideoCaptureManifest, captureSession: AVCaptureSession) {
        self.manifest = manifest
        super.init(nibName: nil, bundle: nil)
        modalPresentationStyle = .fullScreen
        previewView.previewLayer.session = captureSession
        previewView.previewLayer.videoGravity = .resizeAspectFill
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        buildInterface()
        apply(manifest: manifest)
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        guard let orientation = view.window?.windowScene?.interfaceOrientation else { return }
        if let connection = previewView.previewLayer.connection,
           connection.isVideoOrientationSupported,
           let captureOrientation = Self.captureOrientation(from: orientation) {
            connection.videoOrientation = captureOrientation
        }
        delegate?.journalVideoRecorder(self, didChange: orientation)
    }

    override var prefersStatusBarHidden: Bool { true }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .allButUpsideDown }

    func apply(manifest: JournalVideoCaptureManifest) {
        self.manifest = manifest
        updateProgress(durationMs: manifest.durationMs, bytes: manifest.bytes)
        spinner.stopAnimating()
        primaryButton.isHidden = false
        saveButton.isHidden = false
        closeButton.isEnabled = true
        switchButton.isHidden = true

        switch manifest.state {
        case .preparing:
            statusLabel.text = "Preparing camera…"
            primaryButton.isHidden = true
            saveButton.isHidden = true
            spinner.startAnimating()
        case .preview:
            statusLabel.text = manifest.bytes > 0 ? "Your saved portion is ready." : "Ready to record"
            setPrimary(title: manifest.bytes > 0 ? "Resume" : "Record", symbol: "record.circle")
            saveButton.isHidden = manifest.bytes == 0
            setSave(title: "Save this part")
            switchButton.isHidden = false
        case .recording:
            statusLabel.text = "Recording"
            setPrimary(title: "Pause", symbol: "pause.fill")
            setSave(title: "Stop & Save")
        case .paused:
            statusLabel.text = "Paused — this part is saved on this device"
            setPrimary(title: "Resume", symbol: "play.fill")
            setSave(title: "Save this part")
        case .interrupted:
            statusLabel.text = manifest.interruptionReason
                ?? "Interrupted — your saved portion is safe"
            setPrimary(title: "Resume", symbol: "play.fill")
            setSave(title: "Save this part")
        case .finalizing:
            statusLabel.text = "Finalizing your journal video…"
            primaryButton.isHidden = true
            saveButton.isHidden = true
            closeButton.isEnabled = false
            spinner.startAnimating()
        case .pendingHandoff:
            statusLabel.text = "Video saved"
            primaryButton.isHidden = true
            saveButton.isHidden = true
            closeButton.isEnabled = false
        case .failed:
            statusLabel.text = manifest.errorMessage ?? "The recorder needs attention."
            if manifest.bytes > 0 {
                setPrimary(title: "Resume", symbol: "play.fill")
                setSave(title: "Save this part")
            } else {
                setPrimary(title: "Try Again", symbol: "arrow.clockwise")
                saveButton.isHidden = true
            }
        }
    }

    func updateProgress(durationMs: Int64, bytes: Int64) {
        let totalSeconds = max(0, durationMs / 1_000)
        clockLabel.text = String(format: "%02lld:%02lld", totalSeconds / 60, totalSeconds % 60)
        sizeLabel.text = String(format: "%.1f MB", Double(bytes) / 1_048_576)
    }

    func showError(_ message: String) {
        statusLabel.text = message
        statusLabel.textColor = UIColor.systemYellow
    }

    private func buildInterface() {
        [previewView, closeButton, switchButton, clockLabel, sizeLabel, statusLabel,
         teleprompterView, primaryButton, saveButton, spinner].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
            view.addSubview($0)
        }

        let overlay = CAGradientLayer()
        overlay.colors = [UIColor.black.withAlphaComponent(0.62).cgColor, UIColor.clear.cgColor]
        overlay.startPoint = CGPoint(x: 0.5, y: 0)
        overlay.endPoint = CGPoint(x: 0.5, y: 1)
        overlay.frame = CGRect(x: 0, y: 0, width: 2_000, height: 220)
        previewView.layer.addSublayer(overlay)

        configureButton(closeButton, symbol: "xmark", selector: #selector(closePressed))
        configureButton(switchButton, symbol: "camera.rotate.fill", selector: #selector(switchPressed))
        closeButton.accessibilityLabel = "Close recorder"
        switchButton.accessibilityLabel = "Switch camera"

        clockLabel.font = .monospacedDigitSystemFont(ofSize: 17, weight: .semibold)
        clockLabel.textColor = .white
        sizeLabel.font = .systemFont(ofSize: 13, weight: .medium)
        sizeLabel.textColor = UIColor.white.withAlphaComponent(0.82)
        statusLabel.font = .systemFont(ofSize: 15, weight: .semibold)
        statusLabel.textColor = .white
        statusLabel.numberOfLines = 2
        statusLabel.textAlignment = .center

        teleprompterView.text = manifest.teleprompter
        teleprompterView.isEditable = false
        teleprompterView.isSelectable = true
        teleprompterView.backgroundColor = UIColor.black.withAlphaComponent(0.46)
        teleprompterView.textColor = .white
        teleprompterView.font = .systemFont(ofSize: 21, weight: .medium)
        teleprompterView.textAlignment = .center
        teleprompterView.layer.cornerRadius = 14
        teleprompterView.textContainerInset = UIEdgeInsets(top: 12, left: 12, bottom: 12, right: 12)
        teleprompterView.isHidden = manifest.teleprompter.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty

        primaryButton.addTarget(self, action: #selector(primaryPressed), for: .touchUpInside)
        primaryButton.tintColor = .white
        primaryButton.backgroundColor = UIColor.systemRed.withAlphaComponent(0.94)
        primaryButton.layer.cornerRadius = 30
        primaryButton.titleLabel?.font = .systemFont(ofSize: 16, weight: .bold)

        saveButton.addTarget(self, action: #selector(savePressed), for: .touchUpInside)
        saveButton.tintColor = .white
        saveButton.backgroundColor = UIColor.black.withAlphaComponent(0.62)
        saveButton.layer.cornerRadius = 24
        saveButton.titleLabel?.font = .systemFont(ofSize: 15, weight: .semibold)

        spinner.color = .white

        let safe = view.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            previewView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            previewView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            previewView.topAnchor.constraint(equalTo: view.topAnchor),
            previewView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            closeButton.leadingAnchor.constraint(equalTo: safe.leadingAnchor, constant: 12),
            closeButton.topAnchor.constraint(equalTo: safe.topAnchor, constant: 8),
            closeButton.widthAnchor.constraint(equalToConstant: 48),
            closeButton.heightAnchor.constraint(equalToConstant: 48),

            switchButton.trailingAnchor.constraint(equalTo: safe.trailingAnchor, constant: -12),
            switchButton.topAnchor.constraint(equalTo: safe.topAnchor, constant: 8),
            switchButton.widthAnchor.constraint(equalToConstant: 48),
            switchButton.heightAnchor.constraint(equalToConstant: 48),

            clockLabel.centerXAnchor.constraint(equalTo: safe.centerXAnchor),
            clockLabel.topAnchor.constraint(equalTo: safe.topAnchor, constant: 10),
            sizeLabel.centerXAnchor.constraint(equalTo: clockLabel.centerXAnchor),
            sizeLabel.topAnchor.constraint(equalTo: clockLabel.bottomAnchor, constant: 2),

            teleprompterView.leadingAnchor.constraint(greaterThanOrEqualTo: safe.leadingAnchor, constant: 24),
            teleprompterView.trailingAnchor.constraint(lessThanOrEqualTo: safe.trailingAnchor, constant: -24),
            teleprompterView.centerXAnchor.constraint(equalTo: safe.centerXAnchor),
            teleprompterView.centerYAnchor.constraint(equalTo: safe.centerYAnchor, constant: -24),
            teleprompterView.widthAnchor.constraint(lessThanOrEqualToConstant: 560),
            teleprompterView.heightAnchor.constraint(lessThanOrEqualTo: safe.heightAnchor, multiplier: 0.34),

            statusLabel.leadingAnchor.constraint(equalTo: safe.leadingAnchor, constant: 24),
            statusLabel.trailingAnchor.constraint(equalTo: safe.trailingAnchor, constant: -24),
            statusLabel.bottomAnchor.constraint(equalTo: primaryButton.topAnchor, constant: -12),

            primaryButton.centerXAnchor.constraint(equalTo: safe.centerXAnchor, constant: -70),
            primaryButton.bottomAnchor.constraint(equalTo: safe.bottomAnchor, constant: -14),
            primaryButton.widthAnchor.constraint(greaterThanOrEqualToConstant: 120),
            primaryButton.heightAnchor.constraint(equalToConstant: 60),

            saveButton.centerXAnchor.constraint(equalTo: safe.centerXAnchor, constant: 70),
            saveButton.centerYAnchor.constraint(equalTo: primaryButton.centerYAnchor),
            saveButton.widthAnchor.constraint(greaterThanOrEqualToConstant: 120),
            saveButton.heightAnchor.constraint(equalToConstant: 48),

            spinner.centerXAnchor.constraint(equalTo: safe.centerXAnchor),
            spinner.centerYAnchor.constraint(equalTo: safe.centerYAnchor)
        ])
    }

    private func configureButton(_ button: UIButton, symbol: String, selector: Selector) {
        button.setImage(UIImage(systemName: symbol), for: .normal)
        button.tintColor = .white
        button.backgroundColor = UIColor.black.withAlphaComponent(0.55)
        button.layer.cornerRadius = 24
        button.addTarget(self, action: selector, for: .touchUpInside)
    }

    private func setPrimary(title: String, symbol: String) {
        primaryButton.setTitle("  \(title)", for: .normal)
        primaryButton.setImage(UIImage(systemName: symbol), for: .normal)
    }

    private func setSave(title: String) {
        saveButton.setTitle(title, for: .normal)
    }

    @objc private func primaryPressed() {
        switch manifest.state {
        case .recording:
            delegate?.journalVideoRecorderDidRequestPause(self)
        case .preview, .paused, .interrupted, .failed:
            delegate?.journalVideoRecorderDidRequestRecord(self)
        case .preparing, .finalizing, .pendingHandoff:
            break
        }
    }

    @objc private func savePressed() {
        delegate?.journalVideoRecorderDidRequestSave(self)
    }

    @objc private func switchPressed() {
        delegate?.journalVideoRecorderDidRequestCameraSwitch(self)
    }

    @objc private func closePressed() {
        if manifest.state == .finalizing || manifest.state == .pendingHandoff { return }
        if manifest.state == .preview && manifest.bytes <= 0 && manifest.parts.isEmpty {
            delegate?.journalVideoRecorderDidRequestDiscard(self)
            return
        }
        let alert = UIAlertController(
            title: "Keep this recording?",
            message: "Your saved portion can stay on this iPhone until you resume or save it.",
            preferredStyle: .actionSheet
        )
        alert.addAction(UIAlertAction(title: "Keep Draft & Close", style: .default) { [weak self] _ in
            guard let self = self else { return }
            self.delegate?.journalVideoRecorderDidRequestKeepDraft(self)
        })
        if manifest.state == .paused || manifest.state == .interrupted {
            alert.addAction(UIAlertAction(title: "Resume Recording", style: .default) { [weak self] _ in
                guard let self = self else { return }
                self.delegate?.journalVideoRecorderDidRequestRecord(self)
            })
        }
        alert.addAction(UIAlertAction(title: "Discard Recording", style: .destructive) { [weak self] _ in
            guard let self = self else { return }
            self.confirmDiscard()
        })
        alert.addAction(UIAlertAction(title: "Continue", style: .cancel))
        if let popover = alert.popoverPresentationController {
            popover.sourceView = closeButton
            popover.sourceRect = closeButton.bounds
        }
        present(alert, animated: true)
    }

    private func confirmDiscard() {
        let alert = UIAlertController(
            title: "Discard this video?",
            message: "This permanently removes the local recording and cannot be undone.",
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "Keep Recording", style: .cancel))
        alert.addAction(UIAlertAction(title: "Discard", style: .destructive) { [weak self] _ in
            guard let self = self else { return }
            self.delegate?.journalVideoRecorderDidRequestDiscard(self)
        })
        present(alert, animated: true)
    }

    private static func captureOrientation(
        from orientation: UIInterfaceOrientation
    ) -> AVCaptureVideoOrientation? {
        switch orientation {
        case .portrait: return .portrait
        case .portraitUpsideDown: return .portraitUpsideDown
        case .landscapeLeft: return .landscapeLeft
        case .landscapeRight: return .landscapeRight
        default: return nil
        }
    }
}
