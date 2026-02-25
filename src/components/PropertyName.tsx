"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function PropertyName() {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setName((user?.user_metadata?.property_name as string) || null);
    });
  }, []);

  return (
    <h1 className="text-[22px] font-bold tracking-tight text-text-primary">
      {name ?? "My Home"}
    </h1>
  );
}
