import SwiftUI
import WebKit
import RebuzzleCore

struct VisualBoard: View {
    let visual: PuzzleVisual
    let layers: [VisualLayer]
    var body: some View {
        Group {
            switch visual.layout {
            case "stack": VStack(spacing: 12) { layerViews }
            case "grid": LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) { layerViews }
            case "overlay", "free":
                GeometryReader { geometry in
                    ForEach(Array(layers.enumerated()), id: \.offset) { _, layer in
                        VisualLayerView(layer: layer).frame(width: geometry.size.width * 0.3, height: 72)
                            .position(x: geometry.size.width * min(100, max(0, layer.x ?? 50)) / 100, y: geometry.size.height * min(100, max(0, layer.y ?? 50)) / 100)
                    }
                }.frame(height: 220)
            default: HStack(spacing: 12) { layerViews }
            }
        }.frame(maxWidth: .infinity, minHeight: 190).padding(.vertical, 12)
    }
    private var layerViews: some View {
        ForEach(Array(layers.enumerated()), id: \.offset) { _, layer in VisualLayerView(layer: layer).frame(maxWidth: .infinity) }
    }
}
struct VisualLayerView: View {
    let layer: VisualLayer
    var body: some View {
        Group {
            if layer.kind == "pictogram" {
                switch PictogramContent.resolve(svg: layer.svg, fallback: layer.emojiFallback ?? "Picture clue unavailable") {
                case .svg(let source):
                    PictogramVectorView(source: source, fallback: layer.emojiFallback)
                        .frame(minHeight: 90).accessibilityLabel(layer.emojiFallback ?? "Picture clue")
                case .fallback(let text):
                    Text(text).font(Theme.font(34, weight: .medium, relativeTo: .title))
                }
            } else if layer.kind == "image", let src = layer.src, let url = approvedImage(src) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image): image.resizable().scaledToFit()
                    case .failure: Label("Clue image unavailable", systemImage: "wifi.exclamationmark").font(.caption)
                    default: ProgressView()
                    }
                }.frame(height: 100).accessibilityLabel(layer.alt ?? "Picture clue")
            } else {
                Text(layer.emphasis == "stacked" ? layer.text.map(String.init).joined(separator: "\n") : layer.text)
                    .font(Theme.font(textSize, weight: .medium, relativeTo: .title))
                    .strikethrough(layer.emphasis == "strike")
                    .multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
            }
        }
    }
    private var textSize: CGFloat {
        switch layer.emphasis { case "tiny": 12; case "small": 20; case "large": 48; default: layer.kind == "operator" ? 24 : 34 }
    }
    private func approvedImage(_ raw: String) -> URL? {
        guard let url = URL(string: raw, relativeTo: URL(string: "https://rebuzzle.byronwade.com")!), url.scheme == "https", url.host == "rebuzzle.byronwade.com" else { return nil }
        return url
    }
}
/// WebKit paints asynchronously, so a bare web view leaves the clue blank until it
/// finishes. Show the emoji fallback immediately and fade the vector in once painted.
struct PictogramVectorView: View {
    let source: String
    let fallback: String?
    @State private var painted = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var body: some View {
        ZStack {
            if !painted, let fallback {
                Text(fallback).font(.system(size: 44)).accessibilityHidden(true)
            }
            SVGVectorView(source: source) {
                withAnimation(reduceMotion ? nil : .easeOut(duration: 0.18)) { painted = true }
            }
            .opacity(painted ? 1 : 0)
        }
    }
}

// WebKit is used only as an inert SVG decoder, never for app navigation or gameplay.
// XML is reconstructed from a geometry-only allowlist before reaching the renderer.
struct SVGVectorView: UIViewRepresentable {
    let source: String
    var onPainted: () -> Void = {}
    @Environment(\.colorScheme) private var scheme
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        config.defaultWebpagePreferences.allowsContentJavaScript = false
        let view = WKWebView(frame: .zero, configuration: config)
        view.isOpaque = false; view.backgroundColor = .clear
        view.scrollView.isScrollEnabled = false; view.isUserInteractionEnabled = false
        view.navigationDelegate = context.coordinator
        return view
    }
    func updateUIView(_ view: WKWebView, context: Context) {
        let safe = SVGGeometry.sanitize(source)
        let color = scheme == .dark ? "#f7f4ed" : "#202020"
        let key = safe + color
        context.coordinator.onPainted = onPainted
        guard context.coordinator.last != key else { return }
        context.coordinator.last = key
        view.loadHTMLString("<html lang='en'><head><meta name='viewport' content='width=device-width,initial-scale=1'><meta http-equiv='Content-Security-Policy' content=\"default-src 'none'; style-src 'unsafe-inline'\"><style>html,body{margin:0;width:100%;height:100%;background:transparent;color:\(color)}svg{display:block;width:100%;height:100%;color:inherit}</style></head><body>\(safe)</body></html>", baseURL: nil)
    }
    func makeCoordinator() -> Coordinator { Coordinator() }
    @MainActor final class Coordinator: NSObject, WKNavigationDelegate {
        var last = ""
        var onPainted: () -> Void = {}
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { onPainted() }
    }
}
enum PictogramContent: Equatable {
    case svg(String)
    case fallback(String)

    static func resolve(svg: String?, fallback: String) -> Self {
        guard let svg, !svg.isEmpty else { return .fallback(fallback) }
        let sanitized = SVGGeometry.sanitize(svg)
        return sanitized.isEmpty ? .fallback(fallback) : .svg(sanitized)
    }
}

final class SVGGeometry: NSObject, XMLParserDelegate {
    private var output = ""
    private var accepted: [Bool] = []
    private var hasGeometry = false
    private static let geometryTags: Set<String> = ["path", "circle", "ellipse", "rect", "line", "polyline", "polygon"]
    private static let tags: Set<String> = ["svg", "g", "path", "circle", "ellipse", "rect", "line", "polyline", "polygon", "defs", "clipPath", "mask", "linearGradient", "radialGradient", "stop", "title"]
    private static let attributes: Set<String> = ["xmlns", "viewBox", "width", "height", "d", "x", "y", "x1", "x2", "y1", "y2", "cx", "cy", "r", "rx", "ry", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-dasharray", "fill-rule", "clip-rule", "opacity", "fill-opacity", "stroke-opacity", "transform", "points", "id", "clip-path", "mask", "offset", "stop-color", "stop-opacity", "gradientUnits", "gradientTransform"]
    static func sanitize(_ source: String) -> String {
        guard source.utf8.count < 250_000, !source.localizedCaseInsensitiveContains("<!DOCTYPE"), !source.localizedCaseInsensitiveContains("<!ENTITY") else { return "" }
        let delegate = SVGGeometry(), parser = XMLParser(data: Data(source.utf8))
        parser.shouldResolveExternalEntities = false; parser.delegate = delegate
        return parser.parse() && delegate.hasGeometry ? delegate.output : ""
    }
    func parser(_ parser: XMLParser, didStartElement elementName: String, namespaceURI: String?, qualifiedName qName: String?, attributes attributeDict: [String: String]) {
        let allowed = Self.tags.contains(elementName) && !accepted.contains(false)
        accepted.append(allowed)
        guard allowed else { return }
        if Self.geometryTags.contains(elementName) { hasGeometry = true }
        var attrs = attributeDict.filter { Self.attributes.contains($0.key) && !$0.value.contains("://") && !$0.value.localizedCaseInsensitiveContains("javascript") && (!$0.value.contains("url(") || $0.value.hasPrefix("url(#")) }
        // The published ink-pictogram palette uses this fixed ink. Follow the native
        // appearance for that ink only; preserve semantic colors, fills and transparency.
        for paint in ["stroke", "fill"] where attrs[paint]?.lowercased() == "#1a1f1c" {
            attrs[paint] = "currentColor"
        }
        output += "<\(elementName)" + attrs.sorted { $0.key < $1.key }.map { " \($0.key)=\"\(Self.escape($0.value))\"" }.joined() + ">"
    }
    func parser(_ parser: XMLParser, didEndElement elementName: String, namespaceURI: String?, qualifiedName qName: String?) {
        if accepted.popLast() == true { output += "</\(elementName)>" }
    }
    func parser(_ parser: XMLParser, foundCharacters string: String) { if accepted.last == true { output += Self.escape(string) } }
    private static func escape(_ text: String) -> String { text.replacingOccurrences(of: "&", with: "&amp;").replacingOccurrences(of: "\"", with: "&quot;").replacingOccurrences(of: "<", with: "&lt;").replacingOccurrences(of: ">", with: "&gt;") }
}
