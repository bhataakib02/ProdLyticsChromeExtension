import { NextResponse } from "next/server";

export function withCors(response) {
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return response;
}

export function corsOptions() {
    return withCors(NextResponse.json({}, { status: 200 }));
}
