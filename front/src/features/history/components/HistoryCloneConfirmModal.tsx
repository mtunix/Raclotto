import React from "react";
import { Modal, Typography } from "antd";

const { Text } = Typography;

interface HistoryCloneConfirmModalProps {
    visible: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    title: string;
    message: string;
}

export const HistoryCloneConfirmModal: React.FC<HistoryCloneConfirmModalProps> = ({
    visible,
    onConfirm,
    onCancel,
    title,
    message,
}) => {
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
};
