import AppKit

// Silence Control Center — verification-code popup.
// Usage: silence-code-alert <code> <deviceLabel>

let args = CommandLine.arguments
let code = args.count > 1 ? args[1] : "------"
let device = args.count > 2 ? args[2] : "未知设备"
let spaced = code.map { String($0) }.joined(separator: " ")

let app = NSApplication.shared
app.setActivationPolicy(.accessory)

// Brand palette.
let accent = NSColor(calibratedRed: 0.38, green: 0.65, blue: 1.00, alpha: 1.0)  // #60A7FF
let cardBG = NSColor(calibratedRed: 0.055, green: 0.063, blue: 0.085, alpha: 1.0) // #0E1016
let metaFG = NSColor(calibratedWhite: 0.62, alpha: 1.0)

// Dark "key card" holding the code.
let card = NSView(frame: NSRect(x: 0, y: 0, width: 360, height: 112))
card.wantsLayer = true
card.layer?.backgroundColor = cardBG.cgColor
card.layer?.cornerRadius = 16

let codeLabel = NSTextField(labelWithString: spaced)
codeLabel.font = NSFont.monospacedDigitSystemFont(ofSize: 46, weight: .semibold)
codeLabel.textColor = accent
codeLabel.alignment = .center
codeLabel.frame = NSRect(x: 8, y: 40, width: 344, height: 58)

let metaLabel = NSTextField(labelWithString: "设备 \(device) · 5 分钟内有效")
metaLabel.font = NSFont.systemFont(ofSize: 12, weight: .regular)
metaLabel.textColor = metaFG
metaLabel.alignment = .center
metaLabel.frame = NSRect(x: 8, y: 16, width: 344, height: 16)

card.addSubview(codeLabel)
card.addSubview(metaLabel)

let alert = NSAlert()
alert.alertStyle = .informational
if let sym = NSImage(systemSymbolName: "lock.shield.fill", accessibilityDescription: "Silence") {
    sym.isTemplate = true
    alert.icon = sym
}
alert.messageText = "Silence 连接验证码"
alert.informativeText = "在设备上输入下面的验证码，完成本次连接。"
alert.accessoryView = card
alert.addButton(withTitle: "好")

_ = alert.runModal()