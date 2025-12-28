import React from "react";
import {useTranslation} from "react-i18next";
import {getTagColors} from "../../../lib/tagColors";

interface TagOption {
    name: string;
    key: string;
}

interface ExclusiveTagChipGroupProps {
    options: TagOption[];
    selectedValue: string | null; // Only one can be selected
    onChange: (optionName: string | null) => void;
    disabled?: boolean;
}

export function ExclusiveTagChipGroup(props: ExclusiveTagChipGroupProps) {
    const { t } = useTranslation();
    const { options, selectedValue, onChange, disabled = false } = props;

    return (
        <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '16px',
            alignItems: 'center'
        }}>
            {options.map((option) => {
                const isSelected = selectedValue === option.name;
                const tagColors = getTagColors(option.name);
                return (
                    <button
                        key={option.name}
                        type="button"
                        onClick={() => {
                            if (disabled) return;
                            // If clicking the selected one, deselect it (set to null)
                            // Otherwise, select the new one
                            onChange(isSelected ? null : option.name);
                        }}
                        disabled={disabled}
                        style={{
                            minHeight: '44px',
                            padding: '12px 20px',
                            borderRadius: '12px',
                            fontSize: '15px',
                            fontWeight: 500,
                            letterSpacing: '-0.022em',
                            border: isSelected ? `1px solid ${tagColors.color}` : '1px solid #d2d2d7',
                            backgroundColor: isSelected ? tagColors.backgroundColorSelected || tagColors.backgroundColor : '#f5f5f7',
                            color: isSelected ? tagColors.color : '#8e8e93',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: isSelected ? `0 2px 8px ${tagColors.color}33` : 'none',
                            outline: 'none',
                            fontFamily: 'inherit',
                            opacity: disabled ? 0.6 : 1
                        }}
                        onMouseEnter={(e) => {
                            if (disabled) return;
                            if (!isSelected) {
                                e.currentTarget.style.backgroundColor = '#e8e8ed';
                                e.currentTarget.style.borderColor = tagColors.color;
                                e.currentTarget.style.color = tagColors.color;
                            } else {
                                e.currentTarget.style.backgroundColor = tagColors.backgroundColorSelected || tagColors.backgroundColor;
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (disabled) return;
                            if (!isSelected) {
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

