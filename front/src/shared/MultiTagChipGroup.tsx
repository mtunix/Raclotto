import React from "react";
import {useTranslation} from "react-i18next";
import {getTagColors} from "../lib/tagColors";

interface TagOption {
    name: string;
    key: string;
}

interface MultiTagChipGroupProps {
    options: TagOption[];
    values: Record<string, boolean>;
    onChange: (optionName: string, checked: boolean) => void;
    disabled?: boolean;
    allowWrap?: boolean; // If false, forces single line
}

export function MultiTagChipGroup(props: MultiTagChipGroupProps) {
    const { t } = useTranslation();
    const { options, values, onChange, disabled = false, allowWrap = true } = props;

    const getValue = (optionName: string): boolean => {
        return values[optionName] || false;
    };

    return (
        <div style={{ 
            display: 'flex', 
            flexWrap: allowWrap ? 'wrap' : 'nowrap',
            gap: '16px',
            alignItems: 'center',
            overflowX: allowWrap ? 'visible' : 'auto',
            ...(allowWrap ? {} : { 
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(142, 142, 147, 0.3) transparent'
            })
        }}>
            {options.map((option) => {
                const isChecked = getValue(option.name);
                const tagColors = getTagColors(option.name);
                return (
                    <button
                        key={option.name}
                        type="button"
                        onClick={() => !disabled && onChange(option.name, !isChecked)}
                        disabled={disabled}
                        style={{
                            minHeight: '44px',
                            padding: '12px 20px',
                            borderRadius: '12px',
                            fontSize: '15px',
                            fontWeight: 500,
                            letterSpacing: '-0.022em',
                            border: isChecked ? `1px solid ${tagColors.color}` : '1px solid #d2d2d7',
                            backgroundColor: isChecked ? tagColors.backgroundColorSelected || tagColors.backgroundColor : '#f5f5f7',
                            color: isChecked ? tagColors.color : '#8e8e93',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: isChecked ? `0 2px 8px ${tagColors.color}33` : 'none',
                            outline: 'none',
                            fontFamily: 'inherit',
                            opacity: disabled ? 0.6 : 1,
                            flexShrink: 0
                        }}
                        onMouseEnter={(e) => {
                            if (disabled) return;
                            if (!isChecked) {
                                e.currentTarget.style.backgroundColor = '#e8e8ed';
                                e.currentTarget.style.borderColor = tagColors.color;
                                e.currentTarget.style.color = tagColors.color;
                            } else {
                                e.currentTarget.style.backgroundColor = tagColors.backgroundColorSelected || tagColors.backgroundColor;
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (disabled) return;
                            if (!isChecked) {
                                e.currentTarget.style.backgroundColor = '#f5f5f7';
                                e.currentTarget.style.borderColor = '#d2d2d7';
                                e.currentTarget.style.color = '#8e8e93';
                            } else {
                                e.currentTarget.style.backgroundColor = tagColors.backgroundColorSelected || tagColors.backgroundColor;
                            }
                        }}
                    >
                        {t(option.key)}
                    </button>
                );
            })}
        </div>
    );
}

