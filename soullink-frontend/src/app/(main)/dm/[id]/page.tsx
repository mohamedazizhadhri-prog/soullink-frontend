"use client";

import { useParams } from "next/navigation";
import { DirectMessageView } from "@/components/views/DirectMessageView";

export default function DynamicDMPage() {
    const params = useParams();
    const id = params.id as string;

    return (
        <DirectMessageView receiverId={id} />
    );
}
