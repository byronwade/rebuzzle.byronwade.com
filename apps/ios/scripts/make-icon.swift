import AppKit
let size = NSSize(width: 1024, height: 1024)
let context = CGContext(data: nil, width: 1024, height: 1024, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(cgContext: context, flipped: false)
NSColor(srgbRed: 0.063, green: 0.063, blue: 0.063, alpha: 1).setFill()
NSRect(origin: .zero, size: size).fill()
let cream = NSColor(srgbRed: 0.968, green: 0.956, blue: 0.929, alpha: 1)
for (x,y) in [(210,526),(526,526),(210,210)] {
    cream.setFill()
    NSBezierPath(roundedRect: NSRect(x: x, y: y, width: 288, height: 288), xRadius: 36, yRadius: 36).fill()
}
NSColor(srgbRed: 0.22, green: 0.39, blue: 0.86, alpha: 1).setFill()
NSBezierPath(roundedRect: NSRect(x: 526,y: 210,width: 288,height: 288), xRadius: 36, yRadius: 36).fill()
let glyphs: [(String, CGFloat, CGFloat)] = [("r", 286, 548), ("e", 594, 548), ("b", 280, 229)]
for (text,x,y) in glyphs {
    (text as NSString).draw(at: NSPoint(x:x,y:y), withAttributes: [.font:NSFont.systemFont(ofSize: 210,weight:.medium), .foregroundColor:NSColor(srgbRed:0.063,green:0.063,blue:0.063,alpha:1)])
}
cream.setFill()
NSBezierPath(roundedRect: NSRect(x: 605,y: 340,width: 130,height: 28), xRadius: 8,yRadius: 8).fill()
NSBezierPath(roundedRect: NSRect(x: 656,y: 289,width: 28,height: 130), xRadius: 8,yRadius: 8).fill()
NSGraphicsContext.restoreGraphicsState()
let bitmap = NSBitmapImageRep(cgImage: context.makeImage()!)
try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
