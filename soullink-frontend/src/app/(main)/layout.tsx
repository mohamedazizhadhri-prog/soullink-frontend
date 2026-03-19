import { Shell } from "@/components/layout/Shell";

export default function MainLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <Shell>
            {children}
        </Shell>
    );
}
