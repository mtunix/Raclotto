import {Select, Space, Typography} from 'antd';
import {useTranslation} from "react-i18next";
import type {ListPansDirection, ListPansSort} from "../../../api/generated/model";

const {Text} = Typography;

interface SortingControlsProps {
    sortField: ListPansSort;
    sortDirection: ListPansDirection;
    onSortFieldChange: (field: ListPansSort) => void;
    onSortDirectionChange: (direction: ListPansDirection) => void;
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
                options={[
                    { value: "time", label: t("history.time") || "Time" },
                    { value: "rating", label: t("history.rating") || "Rating" },
                    { value: "counts", label: t("history.ingredientCounts") || "Ingredient + Sauce counts" },
                ]}
            />
            <Select
                value={sortDirection}
                onChange={onSortDirectionChange}
                style={{flex: 1, minWidth: 80}}
                size="large"
                options={[
                    { value: "desc", label: t("history.descending") || "Descending" },
                    { value: "asc", label: t("history.ascending") || "Ascending" },
                ]}
            />
        </Space>
    );
}
