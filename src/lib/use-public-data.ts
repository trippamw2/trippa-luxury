"use client";

import { useState, useEffect } from "react";
import { PROPERTIES, JOURNAL_POSTS, PACKAGES } from "@/lib/constants";

export function useProperties() {
  const [data, setData] = useState(PROPERTIES);
  useEffect(() => {
    fetch("/api/data/properties")
      .then((r) => r.json())
      .then((json) => { if (json.data) setData(json.data); })
      .catch(() => {});
  }, []);
  return data;
}

export function useBlogPosts() {
  const [data, setData] = useState(JOURNAL_POSTS);
  useEffect(() => {
    fetch("/api/data/blog")
      .then((r) => r.json())
      .then((json) => { if (json.data) setData(json.data); })
      .catch(() => {});
  }, []);
  return data;
}

export function usePackages() {
  const [data, setData] = useState(PACKAGES);
  useEffect(() => {
    fetch("/api/data/packages")
      .then((r) => r.json())
      .then((json) => { if (json.data) setData(json.data); })
      .catch(() => {});
  }, []);
  return data;
}
