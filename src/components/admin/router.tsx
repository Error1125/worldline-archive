/**
 * v5.4 Admin client-side router.
 *
 * The console keeps every Astro page as a deep-link entry point; once the
 * React shell mounts it takes over navigation via history.pushState so the
 * shell (sidebar / topbar / session) persists and only the content pane
 * swaps. Navigation can be intercepted by "unsaved changes" guards that are
 * registered by screens through useAdminNavGuard.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ContentType } from "@/lib/admin/api";

/* ------------------------------------------------------------------ */
/* Route model                                                          */
/* ------------------------------------------------------------------ */

export const SETTINGS_SECTIONS = ["site", "profile", "worldline", "bangumi"] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export type AdminRoute =
  | { screen: "dashboard" }
  | { screen: "publish-index" }
  | { screen: "publish-form"; type: ContentType }
  | { screen: "drafts" }
  | { screen: "media" }
  | { screen: "projects" }
  | { screen: "content" }
  | { screen: "settings"; section: SettingsSection };

const PUBLISH_TYPES: readonly ContentType[] = [
  "moment",
  "post",
  "photo",
  "project",
  "music",
  "anime",
  "bug",
];

/** Build the absolute pathname (including site base) for a route. */
export function buildAdminPath(siteBase: string, route: AdminRoute): string {
  const p = (rest: string) => `${siteBase}/admin${rest}`;
  switch (route.screen) {
    case "dashboard":
      return p("/dashboard");
    case "publish-index":
      return p("/publish");
    case "publish-form":
      return p(`/publish/${route.type}`);
    case "drafts":
      return p("/drafts");
    case "media":
      return p("/media");
    case "projects":
      return p("/projects");
    case "content":
      return p("/content");
    case "settings":
      return p(`/settings/${route.section}`);
  }
}

/** Parse a pathname (with or without the site base prefix) into a route. */
export function parseAdminPath(siteBase: string, pathname: string): AdminRoute | null {
  let path = pathname;
  if (siteBase && path.startsWith(siteBase)) path = path.slice(siteBase.length);
  path = path.replace(/\/+$/, "");
  if (!path.startsWith("/admin")) return null;
  const rest = path.slice("/admin".length);
  const seg = rest.split("/").filter(Boolean);
  if (seg.length === 0) return { screen: "dashboard" };
  switch (seg[0]) {
    case "dashboard":
      return { screen: "dashboard" };
    case "publish": {
      if (seg.length === 1) return { screen: "publish-index" };
      const t = seg[1] as ContentType;
      if (PUBLISH_TYPES.includes(t)) return { screen: "publish-form", type: t };
      return { screen: "publish-index" };
    }
    case "drafts":
      return { screen: "drafts" };
    case "media":
      return { screen: "media" };
    case "projects":
      return { screen: "projects" };
    case "content":
      return { screen: "content" };
    case "settings": {
      const s = (seg[1] ?? "site") as SettingsSection;
      return { screen: "settings", section: SETTINGS_SECTIONS.includes(s) ? s : "site" };
    }
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Router context                                                       */
/* ------------------------------------------------------------------ */

export type AdminLocation = {
  route: AdminRoute;
  /** Absolute pathname including the site base. */
  path: string;
  /** Query string including the leading "?" or "". */
  search: string;
};

export type NavigateOptions = {
  replace?: boolean;
  /** Query string, must start with "?" when non-empty. Defaults to "". */
  search?: string;
};

/**
 * A guard receives the target path and resolves to true when navigation may
 * proceed. Guards typically open a confirm dialog.
 */
export type NavGuard = (targetPath: string) => boolean | Promise<boolean>;

type RouterCtx = {
  siteBase: string;
  location: AdminLocation;
  navigate: (to: AdminRoute | string, opts?: NavigateOptions) => Promise<boolean>;
  registerGuard: (guard: NavGuard) => () => void;
};

const RouterContext = createContext<RouterCtx | null>(null);

function readLocation(siteBase: string, fallback: AdminRoute): AdminLocation {
  if (typeof window === "undefined") {
    return { route: fallback, path: buildAdminPath(siteBase, fallback), search: "" };
  }
  const route = parseAdminPath(siteBase, window.location.pathname) ?? fallback;
  return { route, path: window.location.pathname, search: window.location.search };
}

export function AdminRouterProvider({
  siteBase,
  initialRoute,
  children,
}: {
  siteBase: string;
  initialRoute: AdminRoute;
  children: React.ReactNode;
}) {
  const [location, setLocation] = useState<AdminLocation>(() =>
    readLocation(siteBase, initialRoute),
  );
  const guardsRef = useRef<Set<NavGuard>>(new Set());
  /** Serialises navigations so a slow guard dialog can't be raced. */
  const busyRef = useRef(false);
  const locRef = useRef(location);
  locRef.current = location;

  const runGuards = useCallback(async (targetPath: string): Promise<boolean> => {
    for (const guard of Array.from(guardsRef.current)) {
      try {
        const ok = await guard(targetPath);
        if (!ok) return false;
      } catch {
        return false;
      }
    }
    return true;
  }, []);

  const navigate = useCallback(
    async (to: AdminRoute | string, opts?: NavigateOptions): Promise<boolean> => {
      if (busyRef.current) return false;
      let route: AdminRoute | null;
      let path: string;
      let search: string;
      if (typeof to === "string") {
        const [rawPath, rawQuery] = to.split("?");
        route = parseAdminPath(siteBase, rawPath ?? "");
        if (!route) return false;
        path = buildAdminPath(siteBase, route);
        search = opts?.search ?? (rawQuery ? `?${rawQuery}` : "");
      } else {
        route = to;
        path = buildAdminPath(siteBase, route);
        search = opts?.search ?? "";
      }
      const cur = locRef.current;
      if (cur.path === path && cur.search === search) return true;
      busyRef.current = true;
      try {
        const ok = await runGuards(path + search);
        if (!ok) return false;
        const url = path + search;
        if (opts?.replace) window.history.replaceState({}, "", url);
        else window.history.pushState({}, "", url);
        setLocation({ route, path, search });
        return true;
      } finally {
        busyRef.current = false;
      }
    },
    [siteBase, runGuards],
  );

  // Back / forward buttons must also respect guards. When a guard rejects we
  // push the previous URL back so the address bar matches the visible screen
  // (a small amount of history noise is an accepted trade-off).
  useEffect(() => {
    const onPop = () => {
      const prev = locRef.current;
      const next = readLocation(siteBase, prev.route);
      if (next.path === prev.path && next.search === prev.search) return;
      void (async () => {
        if (busyRef.current) {
          window.history.pushState({}, "", prev.path + prev.search);
          return;
        }
        busyRef.current = true;
        try {
          const ok = await runGuards(next.path + next.search);
          if (!ok) {
            window.history.pushState({}, "", prev.path + prev.search);
            return;
          }
          setLocation(next);
        } finally {
          busyRef.current = false;
        }
      })();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [siteBase, runGuards]);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      const prev = window.history.scrollRestoration;
      window.history.scrollRestoration = "manual";
      return () => {
        window.history.scrollRestoration = prev;
      };
    }
    return undefined;
  }, []);

  const registerGuard = useCallback((guard: NavGuard) => {
    guardsRef.current.add(guard);
    return () => {
      guardsRef.current.delete(guard);
    };
  }, []);

  const ctx = useMemo<RouterCtx>(
    () => ({ siteBase, location, navigate, registerGuard }),
    [siteBase, location, navigate, registerGuard],
  );

  return <RouterContext.Provider value={ctx}>{children}</RouterContext.Provider>;
}

export function useAdminRouter(): RouterCtx {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("useAdminRouter must be used within AdminRouterProvider");
  return ctx;
}

export function useAdminLocation(): AdminLocation {
  return useAdminRouter().location;
}

export function useAdminNavigate() {
  return useAdminRouter().navigate;
}

/**
 * Register (or clear, with null) an unsaved-changes guard for the lifetime of
 * the calling screen. The latest closure is always used, so screens can pass
 * an inline async function that reads current state.
 */
export function useAdminNavGuard(guard: NavGuard | null) {
  const { registerGuard } = useAdminRouter();
  const ref = useRef<NavGuard | null>(guard);
  ref.current = guard;
  const active = guard != null;
  useEffect(() => {
    if (!active) return undefined;
    const wrapped: NavGuard = (target) => {
      const g = ref.current;
      return g ? g(target) : true;
    };
    return registerGuard(wrapped);
  }, [active, registerGuard]);
}

/* ------------------------------------------------------------------ */
/* NavLink                                                              */
/* ------------------------------------------------------------------ */

type NavLinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to: AdminRoute | string;
  search?: string;
  replace?: boolean;
};

/**
 * Anchor that performs an in-shell navigation. Keeps native semantics
 * (href, middle click, cmd/ctrl click, target=_blank all behave normally).
 */
export function NavLink({ to, search, replace, onClick, ...rest }: NavLinkProps) {
  const { siteBase, navigate } = useAdminRouter();
  const href =
    typeof to === "string"
      ? to
      : buildAdminPath(siteBase, to) + (search ?? "");
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (rest.target && rest.target !== "_self") return;
    e.preventDefault();
    void navigate(to, { search, replace });
  };
  return <a href={href} onClick={handleClick} {...rest} />;
}
