(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/app/install-button.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>InstallButton
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$download$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Download$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/download.js [app-client] (ecmascript) <export default as Download>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-check.js [app-client] (ecmascript) <export default as CheckCircle2>");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function isIosDevice() {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent.toLowerCase();
    const isIPhone = /iphone/.test(ua);
    const isIPad = /ipad/.test(ua);
    const isIPod = /ipod/.test(ua);
    const isModernIPad = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
    return isIPhone || isIPad || isIPod || isModernIPad;
}
function isStandaloneMode() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const mediaStandalone = window.matchMedia?.("(display-mode: standalone)")?.matches ?? false;
    const iosStandalone = isIosDevice() && typeof window.navigator.standalone === "boolean" ? Boolean(window.navigator.standalone) : false;
    return mediaStandalone || iosStandalone;
}
function InstallButton() {
    _s();
    const [deferredPrompt, setDeferredPrompt] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isInstalled, setIsInstalled] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isInstalling, setIsInstalling] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isIos, setIsIos] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "InstallButton.useEffect": ()=>{
            const syncInstalledState = {
                "InstallButton.useEffect.syncInstalledState": ()=>{
                    const installed = isStandaloneMode();
                    setIsInstalled(installed);
                    if (installed) {
                        setDeferredPrompt(null);
                        setIsInstalling(false);
                    }
                }
            }["InstallButton.useEffect.syncInstalledState"];
            setIsIos(isIosDevice());
            syncInstalledState();
            const handleBeforeInstallPrompt = {
                "InstallButton.useEffect.handleBeforeInstallPrompt": (event)=>{
                    event.preventDefault();
                    setDeferredPrompt(event);
                }
            }["InstallButton.useEffect.handleBeforeInstallPrompt"];
            const handleAppInstalled = {
                "InstallButton.useEffect.handleAppInstalled": ()=>{
                    setIsInstalled(true);
                    setDeferredPrompt(null);
                    setIsInstalling(false);
                }
            }["InstallButton.useEffect.handleAppInstalled"];
            const handleVisibilityChange = {
                "InstallButton.useEffect.handleVisibilityChange": ()=>{
                    if (document.visibilityState === "visible") {
                        syncInstalledState();
                    }
                }
            }["InstallButton.useEffect.handleVisibilityChange"];
            window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.addEventListener("appinstalled", handleAppInstalled);
            window.addEventListener("focus", syncInstalledState);
            window.addEventListener("pageshow", syncInstalledState);
            document.addEventListener("visibilitychange", handleVisibilityChange);
            return ({
                "InstallButton.useEffect": ()=>{
                    window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
                    window.removeEventListener("appinstalled", handleAppInstalled);
                    window.removeEventListener("focus", syncInstalledState);
                    window.removeEventListener("pageshow", syncInstalledState);
                    document.removeEventListener("visibilitychange", handleVisibilityChange);
                }
            })["InstallButton.useEffect"];
        }
    }["InstallButton.useEffect"], []);
    const label = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "InstallButton.useMemo[label]": ()=>{
            if (isInstalled) return "Installed";
            if (isInstalling) return "Installing...";
            return "Install App";
        }
    }["InstallButton.useMemo[label]"], [
        isInstalled,
        isInstalling
    ]);
    const handleInstall = async ()=>{
        if (isInstalled || isInstalling) return;
        if (deferredPrompt) {
            try {
                setIsInstalling(true);
                await deferredPrompt.prompt();
                const choice = await deferredPrompt.userChoice;
                if (choice.outcome !== "accepted") {
                    setIsInstalling(false);
                }
            } catch (error) {
                console.error("Install prompt failed:", error);
                setIsInstalling(false);
            }
            return;
        }
        if (isIos) {
            alert('To install DiscipleOS on iPhone or iPad, tap Share, then "Add to Home Screen".');
            return;
        }
        alert("Install isn’t available yet. Try Chrome or Edge, then refresh and try again.");
    };
    const disabled = isInstalled || isInstalling;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        type: "button",
        onClick: handleInstall,
        disabled: disabled,
        "aria-disabled": disabled,
        title: isInstalled ? "App is already installed" : deferredPrompt ? "Install DiscipleOS" : isIos ? "Show iPhone/iPad install instructions" : "Install may not be available yet in this browser state",
        className: [
            "inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm transition",
            isInstalled ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-100" : disabled ? "border-white/10 bg-white/5 text-white/45" : "border-white/10 bg-white/5 text-[#F8FAFC] hover:bg-white/10 active:scale-[0.98]"
        ].join(" "),
        children: [
            isInstalled ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__["CheckCircle2"], {
                className: "h-4 w-4"
            }, void 0, false, {
                fileName: "[project]/app/install-button.tsx",
                lineNumber: 157,
                columnNumber: 9
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$download$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Download$3e$__["Download"], {
                className: "h-4 w-4"
            }, void 0, false, {
                fileName: "[project]/app/install-button.tsx",
                lineNumber: 159,
                columnNumber: 9
            }, this),
            label
        ]
    }, void 0, true, {
        fileName: "[project]/app/install-button.tsx",
        lineNumber: 133,
        columnNumber: 5
    }, this);
}
_s(InstallButton, "aQdd5A2ZK+IG/ZRuct0YiVVzGUg=");
_c = InstallButton;
var _c;
__turbopack_context__.k.register(_c, "InstallButton");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/install-button.tsx [app-client] (ecmascript, next/dynamic entry)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/app/install-button.tsx [app-client] (ecmascript)"));
}),
"[project]/node_modules/lucide-react/dist/esm/icons/download.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "__iconNode",
    ()=>__iconNode,
    "default",
    ()=>Download
]);
/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/createLucideIcon.js [app-client] (ecmascript)");
;
const __iconNode = [
    [
        "path",
        {
            d: "M12 15V3",
            key: "m9g1x1"
        }
    ],
    [
        "path",
        {
            d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",
            key: "ih7n3h"
        }
    ],
    [
        "path",
        {
            d: "m7 10 5 5 5-5",
            key: "brsn70"
        }
    ]
];
const Download = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])("download", __iconNode);
;
}),
"[project]/node_modules/lucide-react/dist/esm/icons/download.js [app-client] (ecmascript) <export default as Download>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Download",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$download$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$download$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/download.js [app-client] (ecmascript)");
}),
]);

//# sourceMappingURL=_05khhvt._.js.map