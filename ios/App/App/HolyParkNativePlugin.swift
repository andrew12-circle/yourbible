import AVFoundation
import AVKit
import Capacitor
import LocalAuthentication
import PencilKit

@objc(HolyParkNativePlugin)
public final class HolyParkNativePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HolyParkNativePlugin"
    public let jsName = "HolyParkNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "capabilities", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "prepareMediaSession", returnType: CAPPluginReturnPromise)
    ]

    @objc public func authenticate(_ call: CAPPluginCall) {
        let context = LAContext()
        var error: NSError?
        let policy: LAPolicy = .deviceOwnerAuthentication

        guard context.canEvaluatePolicy(policy, error: &error) else {
            call.reject(error?.localizedDescription ?? "Device authentication is unavailable")
            return
        }

        let reason = call.getString("reason") ?? "Unlock Holy Park Architecture"
        context.evaluatePolicy(policy, localizedReason: reason) { success, authenticationError in
            DispatchQueue.main.async {
                if success {
                    call.resolve(["authenticated": true])
                } else {
                    call.reject(authenticationError?.localizedDescription ?? "Authentication failed")
                }
            }
        }
    }

    @objc public func capabilities(_ call: CAPPluginCall) {
        let context = LAContext()
        var error: NSError?
        let biometricsAvailable = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
        let biometry: String

        switch context.biometryType {
        case .faceID: biometry = "faceID"
        case .touchID: biometry = "touchID"
        default: biometry = "none"
        }

        call.resolve([
            "biometricsAvailable": biometricsAvailable,
            "biometryType": biometry,
            "pencilKitAvailable": UIDevice.current.userInterfaceIdiom == .pad,
            "pictureInPictureAvailable": AVPictureInPictureController.isPictureInPictureSupported()
        ])
    }

    @objc public func prepareMediaSession(_ call: CAPPluginCall) {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(
                .playAndRecord,
                mode: .videoRecording,
                options: [.defaultToSpeaker, .allowBluetoothHFP, .mixWithOthers]
            )
            try session.setActive(true)
            call.resolve()
        } catch {
            call.reject("Unable to prepare the native media session", nil, error)
        }
    }
}

final class HolyParkBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(HolyParkNativePlugin())
    }
}
