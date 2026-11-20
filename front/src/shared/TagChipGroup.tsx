import {useTranslation} from "react-i18next";
import "./tagColors.css";
import "./TagChipGroup.css";

interface TagOption {
    name: string;
    key: string;
}

interface TagChipProps {
    option: TagOption;
    on: boolean;
    disabled: boolean;
    onClick: () => void;
}

/** A toggle in the colour of the tag it stands for. */
function TagChip({option, on, disabled, onClick}: TagChipProps) {
    const { t } = useTranslation();
    return (
        <button
            type="button"
            className={`tag-chip tag-color-${option.name}${on ? " tag-chip-on" : ""}`}
            onClick={onClick}
            disabled={disabled}
        >
            {t(option.key)}
        </button>
    );
}

interface TagChipGroupProps {
    options: TagOption[];
    values: Record<string, boolean>;
    onChange: (optionName: string, checked: boolean) => void;
    disabled?: boolean;
}

/** Tags that are each on or off. */
export function TagChipGroup({ options, values, onChange, disabled = false }: TagChipGroupProps) {
    return (
        <div className="tag-chip-group">
            {options.map((option) => {
                const on = values[option.name] || false;
                return <TagChip key={option.name} option={option} on={on} disabled={disabled} onClick={() => onChange(option.name, !on)} />;
            })}
        </div>
    );
}

interface ExclusiveTagChipGroupProps {
    options: TagOption[];
    selectedValue: string | null;
    /** The tag chosen, or null when the chosen one was clicked again. */
    onChange: (optionName: string | null) => void;
    disabled?: boolean;
}

/** Tags of which at most one is on. */
export function ExclusiveTagChipGroup({ options, selectedValue, onChange, disabled = false }: ExclusiveTagChipGroupProps) {
    return (
        <div className="tag-chip-group">
            {options.map((option) => {
                const on = selectedValue === option.name;
                return <TagChip key={option.name} option={option} on={on} disabled={disabled} onClick={() => onChange(on ? null : option.name)} />;
            })}
        </div>
    );
}
