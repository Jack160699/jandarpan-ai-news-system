import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET() {
try {
const cookieStore = await cookies();

```
const response = NextResponse.json({
  ok: true,
});

const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },

      set(name: string, value: string, options: any) {
        response.cookies.set(name, value, options);
      },

      remove(name: string, options: any) {
        response.cookies.set(name, "", {
          ...options,
          maxAge: 0,
        });
      },
    },
  }
);

const {
  data: { user },
  error,
} = await supabase.auth.getUser();

if (error || !user) {
  return NextResponse.json(
    {
      ok: false,
      error: "unauthorized",
    },
    {
      status: 401,
    }
  );
}

return NextResponse.json({
  ok: true,
  user,
});
```

} catch (error) {
console.error("session route error", error);

```
return NextResponse.json(
  {
    ok: false,
    error: "server_error",
  },
  {
    status: 500,
  }
);
```

}
}
