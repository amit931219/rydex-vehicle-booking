import { handlers } from "../src/auth";
import { NextRequest } from "next/server";

async function testLogin(email: string, pass: string) {
  const csrfReq = new NextRequest("http://localhost:3000/api/auth/csrf");
  const csrfRes = await handlers.GET(csrfReq);
  const cookie = csrfRes.headers.get("set-cookie") || "";
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;

  const req = new NextRequest("http://localhost:3000/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      cookie: cookie.split(";")[0],
    },
    body: new URLSearchParams({
      csrfToken: csrfToken,
      email: email,
      password: pass,
    }),
  });

  const res = await handlers.POST(req);
  const loc = res.headers.get("location");
  const hasCookie = !!res.headers.get("set-cookie");
  return { status: res.status, loc, hasCookie };
}

async function run() {
  const tests = [
    { email: "admin@rydex.com", pass: "Admin@1234", desc: "Admin test credentials" },
    { email: "admin@rydex.com", pass: "admin@1234", desc: "Admin test lowercase" },
    { email: "amt931219@gmail.com", pass: "Admin@1234", desc: "amt931219@gmail.com Admin" },
    { email: "user@rydex.com", pass: "User@1234", desc: "User test credentials" },
    { email: "user@rydex.com", pass: "user@1234", desc: "User test lowercase" },
    { email: "driver@rydex.com", pass: "Driver@1234", desc: "Driver test credentials" },
    { email: "driver@rydex.com", pass: "driver@1234", desc: "Driver test lowercase" },
    { email: "admin@rydex.com", pass: "wrongpassword", desc: "Invalid password check" },
  ];

  for (const t of tests) {
    const res = await testLogin(t.email, t.pass);
    console.log(`[${t.desc}] -> Status: ${res.status}, Location: ${res.loc}, SessionCookie: ${res.hasCookie}`);
  }
}

run();
