"use client";

import { useState, useEffect } from "react";
import type liff from "@line/liff";

type Liff = typeof liff;

export function useLiff() {
  const [liffObject, setLiffObject] = useState<Liff | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initLiff() {
      try {
        const liffModule = (await import("@line/liff")).default;
        await liffModule.init({
          liffId: process.env.NEXT_PUBLIC_LIFF_ID!,
        });
        setLiffObject(liffModule);
        setIsLoggedIn(liffModule.isLoggedIn());
        setIsReady(true);
      } catch (err) {
        console.error("LIFF init error:", err);
        setError("LIFF の初期化に失敗しました");
        setIsReady(true);
      }
    }

    initLiff();
  }, []);

  function login() {
    if (liffObject && !isLoggedIn) {
      liffObject.login();
    }
  }

  function logout() {
    if (liffObject && isLoggedIn) {
      liffObject.logout();
      window.location.reload();
    }
  }

  return { liff: liffObject, isLoggedIn, isReady, error, login, logout };
}
