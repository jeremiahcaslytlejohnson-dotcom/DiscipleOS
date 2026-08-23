module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[project]/app/api/reading/plans/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DELETE",
    ()=>DELETE,
    "GET",
    ()=>GET,
    "POST",
    ()=>POST,
    "dynamic",
    ()=>dynamic
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$neondatabase$2f$serverless$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@neondatabase/serverless/index.mjs [app-route] (ecmascript)");
;
const dynamic = "force-dynamic";
function getDatabaseUrl() {
    return process.env.DISCIPLEOS_POSTGRES_URL || process.env.discipleos_POSTGRES_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;
}
function getSql() {
    const databaseUrl = getDatabaseUrl();
    if (!databaseUrl) {
        throw new Error("No database connection string was provided to neon()");
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$neondatabase$2f$serverless$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["neon"])(databaseUrl);
}
async function GET() {
    try {
        const sql = getSql();
        const rows = await sql`
      SELECT data
      FROM reading_plans
      ORDER BY updated_at DESC
    `;
        const plans = rows.map((row)=>row.data);
        return Response.json({
            success: true,
            plans
        });
    } catch (error) {
        console.error("GET /api/reading/plans failed:", error);
        return Response.json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        }, {
            status: 500
        });
    }
}
async function POST(request) {
    try {
        const sql = getSql();
        const plan = await request.json();
        if (!plan?.id) {
            return Response.json({
                success: false,
                error: "Missing plan id"
            }, {
                status: 400
            });
        }
        await sql`
      INSERT INTO reading_plans (id, data, updated_at)
      VALUES (${plan.id}, ${JSON.stringify(plan)}::jsonb, NOW())
      ON CONFLICT (id)
      DO UPDATE SET
        data = EXCLUDED.data,
        updated_at = NOW()
    `;
        return Response.json({
            success: true,
            plan
        });
    } catch (error) {
        console.error("POST /api/reading/plans failed:", error);
        return Response.json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        }, {
            status: 500
        });
    }
}
async function DELETE(request) {
    try {
        const sql = getSql();
        const body = await request.json();
        const id = body?.id;
        if (!id) {
            return Response.json({
                success: false,
                error: "Missing plan id"
            }, {
                status: 400
            });
        }
        const result = await sql`
  DELETE FROM reading_plans
  WHERE id = ${id}
  RETURNING id
`;
        return Response.json({
            success: result.length > 0,
            id,
            deletedCount: result.length
        });
    } catch (error) {
        console.error("DELETE /api/reading/plans failed:", error);
        return Response.json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__03inndw._.js.map