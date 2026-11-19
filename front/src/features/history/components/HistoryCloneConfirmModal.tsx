import { Modal, Typography } from "antd";

const { Text } = Typography;

interface HistoryCloneConfirmModalProps {
    visible: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    title: string;
    message: string;
}

export function HistoryCloneConfirmModal({
    visible,
    onConfirm,
    onCancel,
    title,
    message,
}: HistoryCloneConfirmModalProps) {
    return (
        <Modal
            open={visible}
            title={title}
            onOk={onConfirm}
            onCancel={onCancel}
        >
            <Text>{message}</Text>
        </Modal>
    );
}
