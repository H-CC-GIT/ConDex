"use client";

import { use } from "react";
import { CardScreen } from "@/components/card-screen";

export default function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <CardScreen id={id} />;
}
