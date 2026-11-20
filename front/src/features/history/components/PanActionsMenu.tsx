import { DeleteOutlined, EllipsisOutlined } from "@ant-design/icons";
import { Button, Dropdown, Modal, message } from "antd";
import { useTranslation } from "react-i18next";
import type { PanDto } from "../../../api/generated/model";
import { useAuthStore } from "../../../AuthSlice";
import { failureMessage } from "../../../lib/api/failedRequest";
import { canDeletePan } from "../../../model/permissions";
import { displayName } from "../../../shared/displayName";
import { deleteOwnPan } from "../deleteOwnPan";

interface PanActionsMenuProps {
    pan: PanDto;
    /** After the server deleted the pan, to drop it from the list showing it. */
    onDeleted: (panId: number) => void;
}

/**
 * The "⋯" menu on a pan card, shown only to the pan's author. Deleting asks first: the dialog names
 * the pan, focuses Cancel, ignores the mask, and sends nothing until its danger button is clicked;
 * that button spins and ignores further clicks while the request runs.
 */
export function PanActionsMenu({ pan, onDeleted }: PanActionsMenuProps) {
    const { t } = useTranslation();
    const user = useAuthStore((state) => state.user);
    const [modal, contextHolder] = Modal.useModal();

    if (!canDeletePan(user, pan)) return null;

    function confirmDelete() {
        void modal.confirm({
            title: t("history.deleteConfirmTitle", { name: displayName(pan.name, t) }),
            content: t("history.deleteConfirmMessage"),
            okText: t("history.deleteConfirm"),
            okButtonProps: { danger: true },
            cancelText: t("common.cancel"),
            focusable: { autoFocusButton: "cancel" },
            mask: { closable: false },
            // Resolves either way, so the dialog closes and a failure shows as a message, not a rejection.
            onOk: () =>
                deleteOwnPan(pan)
                    .then(() => {
                        onDeleted(pan.id);
                        void message.success(t("history.panDeleted"));
                    })
                    .catch((error: unknown) => {
                        void message.error(failureMessage(error, t, t("history.panDeleteFailed")));
                    }),
        });
    }

    return (
        <>
            {contextHolder}
            <Dropdown
                trigger={["click"]}
                menu={{
                    items: [{ key: "delete", danger: true, icon: <DeleteOutlined />, label: t("history.deletePan") }],
                    onClick: confirmDelete,
                }}
            >
                <Button
                    type="text"
                    size="small"
                    className="pan-actions-button"
                    icon={<EllipsisOutlined />}
                    aria-label={t("history.panActions")}
                    title={t("history.panActions")}
                />
            </Dropdown>
        </>
    );
}
