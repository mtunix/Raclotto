import React from "react";
import { Alert, Space, Button } from "antd";
import { CloseOutlined, BellOutlined } from "@ant-design/icons";
import { Event } from "../../../model/event";
import "./EventDisplay.css";

type EventDisplayProps = {
    events: Event[];
    onDismiss: (eventId: number) => void;
};

export function EventDisplay(props: EventDisplayProps) {
    if (!props.events || props.events.length === 0) {
        return null;
    }

    // Display the most recent event (first in the list)
    const event = props.events[0];

    const handleDismiss = () => {
        props.onDismiss(event.id);
    };

    return (
        <div className="event-display-container">
            <div className="event-notification">
                <div className="event-content">
                    <BellOutlined className="event-icon" />
                    <span className="event-message">{event.message}</span>
                    <Button
                        type="text"
                        icon={<CloseOutlined />}
                        onClick={handleDismiss}
                        size="large"
                        className="event-dismiss-button"
                    >
                        Dismiss
                    </Button>
                </div>
            </div>
        </div>
    );
}

