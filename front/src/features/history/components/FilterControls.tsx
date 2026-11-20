import type {Key, ReactNode} from "react";
import {Button, Checkbox, Popover, Space, Tag, Typography} from 'antd';
import {useTranslation} from "react-i18next";
import type {ListPansIngredientCountItem} from "../../../api/generated/model";
import {formatNumber, useLanguage} from "../../../lib/language";
import "./HistoryView.css";

const {Text} = Typography;

interface FilterControlsProps {
    selectedUsers: number[];
    selectedRatings: number[];
    selectedIngredientCounts: ListPansIngredientCountItem[];
    uniqueUsers: Array<{ id: number; name: string }>;
    uniqueRatings: number[];
    uniqueIngredientRanges: ListPansIngredientCountItem[];
    onUsersChange: (users: number[]) => void;
    onRatingsChange: (ratings: number[]) => void;
    onIngredientCountsChange: (counts: ListPansIngredientCountItem[]) => void;
    onClearFilters: () => void;
}

interface FilterPopoverProps<T extends Key> {
    title: string;
    label: string;
    options: { value: T; label: ReactNode }[];
    selected: T[];
    onChange: (values: T[]) => void;
}

/** A button that opens the checkboxes of one filter, and counts how many are ticked. */
function FilterPopover<T extends Key>({title, label, options, selected, onChange}: FilterPopoverProps<T>) {
    return (
        <Popover
            title={title}
            trigger="click"
            content={
                <div className="history-filter-options">
                    <Checkbox.Group value={selected} onChange={onChange} className="full-width">
                        <Space orientation="vertical" size="small" className="full-width">
                            {options.map((option) => (
                                <Checkbox key={option.value} value={option.value}>
                                    {option.label}
                                </Checkbox>
                            ))}
                        </Space>
                    </Checkbox.Group>
                </div>
            }
        >
            <Button size="middle" type={selected.length > 0 ? 'primary' : 'default'}>
                {label}
                {selected.length > 0 && <Tag className="ml-4">{selected.length}</Tag>}
            </Button>
        </Popover>
    );
}

export function FilterControls({
    selectedUsers,
    selectedRatings,
    selectedIngredientCounts,
    uniqueUsers,
    uniqueRatings,
    uniqueIngredientRanges,
    onUsersChange,
    onRatingsChange,
    onIngredientCountsChange,
    onClearFilters
}: FilterControlsProps) {
    const {t} = useTranslation();
    const language = useLanguage();

    return (
        <Space size="middle" align="center" wrap>
            <Text strong>{t("history.filters")}:</Text>
            <FilterPopover
                title={t("history.filterByUser")}
                label={t("history.users")}
                options={uniqueUsers.map((user) => ({value: user.id, label: user.name}))}
                selected={selectedUsers}
                onChange={onUsersChange}
            />
            <FilterPopover
                title={t("history.filterByRating")}
                label={t("history.rating")}
                options={uniqueRatings.map((rating) => ({value: rating, label: `${formatNumber(rating, language)} ${t("history.stars")}`}))}
                selected={selectedRatings}
                onChange={onRatingsChange}
            />
            <FilterPopover
                title={t("history.filterByIngredients")}
                label={t("history.ingredients")}
                options={uniqueIngredientRanges.map((range) => ({value: range, label: `${range} ${t("history.ingredients")}`}))}
                selected={selectedIngredientCounts}
                onChange={onIngredientCountsChange}
            />
            <Button
                size="middle"
                onClick={onClearFilters}
                disabled={selectedUsers.length === 0 && selectedRatings.length === 0 && selectedIngredientCounts.length === 0}
            >
                {t("history.clearFilters")}
            </Button>
        </Space>
    );
}
