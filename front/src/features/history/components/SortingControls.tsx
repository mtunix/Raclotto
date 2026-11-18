import React from 'react';
import {Select, Space, Typography} from 'antd';
import {useTranslation} from "react-i18next";

const {Text} = Typography;

interface SortingControlsProps {
    sortField: 'time' | 'rating' | 'counts';
    sortDirection: 'asc' | 'desc';
    onSortFieldChange: (field: 'time' | 'rating' | 'counts') => void;
    onSortDirectionChange: (direction: 'asc' | 'desc') => void;
}

export function SortingControls({
    sortField,
    sortDirection,
    onSortFieldChange,
    onSortDirectionChange
}: SortingControlsProps) {
    const {t} = useTranslation();

    return (
        <Space size="middle" align="center" wrap style={{ width: '100%' }}>
            <Text strong style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                {t("history.sortBy") || "Sort by"}:
            </Text>
            <Select
                value={sortField}
                onChange={onSortFieldChange}
                style={{flex: 2, minWidth: 150}}
                size="large"
            >
                <Select.Option value="time">{t("history.time") || "Time"}</Select.Option>
                <Select.Option value="rating">{t("history.rating") || "Rating"}</Select.Option>
                <Select.Option value="counts">{t("history.ingredientCounts") || "Ingredient + Sauce counts"}</Select.Option>
            </Select>
            <Select
                value={sortDirection}
                onChange={onSortDirectionChange}
                style={{flex: 1, minWidth: 80}}
                size="large"
            >
                <Select.Option value="desc">{t("history.descending") || "Descending"}</Select.Option>
                <Select.Option value="asc">{t("history.ascending") || "Ascending"}</Select.Option>
            </Select>
        </Space>
    );
}
