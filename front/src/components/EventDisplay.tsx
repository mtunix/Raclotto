import React from "react";
import { Alert, Space, Button } from "antd";
import { CloseOutlined, BellOutlined } from "@ant-design/icons";
import { Event } from "../model/event";

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
        <div 
            style={{ 
                marginTop: '16px',
                position: 'relative',
                animation: 'slideInDown 0.5s ease-out'
            }}
        >
            <style>{`
                @keyframes slideInDown {
                    from {
                        transform: translateY(-20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                
                @keyframes gradientShift {
                    0% {
                        background-position: 0% 50%;
                    }
                    50% {
                        background-position: 100% 50%;
                    }
                    100% {
                        background-position: 0% 50%;
                    }
                }
                
                .event-notification {
                    background: linear-gradient(135deg, 
                        #667eea 0%, 
                        #764ba2 25%, 
                        #f093fb 50%, 
                        #4facfe 75%, 
                        #00f2fe 100%);
                    background-size: 300% 300%;
                    animation: gradientShift 3s ease infinite;
                    border: none;
                    border-radius: 18px;
                    padding: 24px 28px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2),
                                0 0 0 2px rgba(255, 255, 255, 0.1) inset;
                    position: relative;
                    overflow: hidden;
                }
                
                .event-notification::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, 
                        transparent, 
                        rgba(255, 255, 255, 0.3), 
                        transparent);
                    animation: shimmer 2s infinite;
                }
                
                @keyframes shimmer {
                    0% {
                        left: -100%;
                    }
                    100% {
                        left: 100%;
                    }
                }
                
                .event-content {
                    position: relative;
                    z-index: 1;
                    color: white;
                    font-weight: 500;
                    font-size: 17px;
                    letter-spacing: -0.022em;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }
                
                .event-icon {
                    font-size: 24px;
                }
            `}</style>
            <div className="event-notification">
                <div className="event-content">
                    <BellOutlined className="event-icon" />
                    <span style={{ flex: 1 }}>{event.message}</span>
                    <Button
                        type="text"
                        icon={<CloseOutlined />}
                        onClick={handleDismiss}
                        size="large"
                        style={{
                            color: 'white',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            background: 'rgba(255, 255, 255, 0.1)',
                            fontWeight: 500,
                            borderRadius: '12px',
                            minHeight: '44px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        }}
                    >
                        Dismiss
                    </Button>
                </div>
            </div>
        </div>
    );
}

