import { useState } from "react";
import { Button, Flex, Modal, QRCode, Typography } from "antd";
import { CopyOutlined, QrcodeOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { SessionDto } from "../../api/generated/model";
import { copyToClipboard } from "../copyToClipboard";
import "./JoinLink.css";

type Joinable = Pick<SessionDto, "join_code" | "active">;

export const joinLink = (session: Pick<SessionDto, "join_code">) =>
    `${window.location.origin}/join/${encodeURIComponent(session.join_code)}`;

/** The session's join link as a QR code to scan at the table, and as text to copy. */
export function JoinQr({ session, size = 200 }: { session: Joinable; size?: number }) {
    const { t } = useTranslation();
    const link = joinLink(session);

    if (!session.active) {
        return <Typography.Text type="secondary">{t("join.closedSession")}</Typography.Text>;
    }
    return (
        <Flex vertical align="center" gap={8} className="join-qr">
            {/* SVG, not canvas: it stays sharp on a TV and renders without a canvas. */}
            <QRCode value={link} size={size} type="svg" bordered={false} className="join-qr-code" />
            <Flex align="center" gap={4} className="join-qr-link">
                <Typography.Text code ellipsis className="join-qr-link-text">
                    {link}
                </Typography.Text>
                <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    aria-label={t("settings.copyToClipboard")}
                    onClick={() => void copyToClipboard(link, t)}
                />
            </Flex>
        </Flex>
    );
}

export function JoinLinkButton({ session }: { session: Joinable }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button
                type="default"
                icon={<QrcodeOutlined />}
                onClick={() => setOpen(true)}
                size="small"
                aria-label={t("join.inviteToTable")}
            >
                <span className="join-link-label">{t("join.inviteToTable")}</span>
            </Button>
            <Modal open={open} onCancel={() => setOpen(false)} footer={null} title={t("join.inviteToTable")} centered>
                <Typography.Paragraph type="secondary">{t("join.scanToJoin")}</Typography.Paragraph>
                <JoinQr session={session} size={240} />
            </Modal>
        </>
    );
}
