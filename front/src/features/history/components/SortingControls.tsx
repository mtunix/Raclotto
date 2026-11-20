import {Select, Space, Typography} from 'antd';
import {useTranslation} from "react-i18next";
import type {ListPansDirection, ListPansSort} from "../../../api/generated/model";
import "./HistoryView.css";

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
        <Space size="middle" align="center" wrap className="full-width">
            <Text strong className="history-sorting-label">
                {t("history.sortBy")}:
            </Text>
            <Select
                value={sortField}
                onChange={onSortFieldChange}
                className="history-sort-field"
                size="large"
                options={[
                    { value: "time", label: t("history.time") },
                    { value: "rating", label: t("history.rating") },
                    { value: "counts", label: t("history.ingredientCounts") },
                ]}
            />
            <Select
                value={sortDirection}
                onChange={onSortDirectionChange}
                className="history-sort-direction"
                size="large"
                options={[
                    { value: "desc", label: t("history.descending") },
                    { value: "asc", label: t("history.ascending") },
                ]}
            />
        </Space>
    );
}
