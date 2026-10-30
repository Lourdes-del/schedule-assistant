import { NextResponse } from "next/server";

export function jsonOk(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonErr(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
