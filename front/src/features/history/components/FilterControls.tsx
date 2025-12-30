import React from 'react';
import {Button, Checkbox, Popover, Space, Tag, Typography} from 'antd';
import {useTranslation} from "react-i18next";

const {Text} = Typography;

interface FilterControlsProps {
    selectedUsers: number[];
    selectedRatings: number[];
    selectedIngredientCounts: string[];
    uniqueUsers: Array<{ id: number; name: string }>;
    uniqueRatings: number[];
    uniqueIngredientRanges: string[];
    onUsersChange: (users: number[]) => void;
    onRatingsChange: (ratings: number[]) => void;
    onIngredientCountsChange: (counts: string[]) => void;
    onClearFilters: () => void;
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

    return (
        <Space size="middle" align="center" wrap>
            <Text strong>{t("history.filters") || "Filters"}:</Text>

            {/* User Filter Popover */}
            <Popover
                title={t("history.filterByUser") || "Filter by User"}
                trigger="click"
                content={
                    <div style={{width: 200, maxHeight: '300px', overflowY: 'auto'}}>
                        <Space direction="vertical" style={{width: '100%'}}>
                            <Checkbox.Group
                                value={selectedUsers}
                                onChange={(values) => onUsersChange(values as number[])}
                                style={{width: '100%'}}
                            >
                                <Space direction="vertical" size="small" style={{width: '100%'}}>
                                    {uniqueUsers.map(user => (
                                        <Checkbox key={user.id} value={user.id}>
                                            {user.name}
                                        </Checkbox>
                                    ))}
                                </Space>
                            </Checkbox.Group>
                        </Space>
                    </div>
                }
            >
                <Button
                    size="middle"
                    type={selectedUsers.length > 0 ? 'primary' : 'default'}
                >
                    {t("history.users") || "Users"}
                    {selectedUsers.length > 0 && (
                        <Tag style={{marginLeft: '4px'}}>
                            {selectedUsers.length}
                        </Tag>
                    )}
                </Button>
            </Popover>

            {/* Rating Filter Popover */}
            <Popover
                title={t("history.filterByRating") || "Filter by Rating"}
                trigger="click"
                content={
                    <div style={{width: 200, maxHeight: '300px', overflowY: 'auto'}}>
                        <Space direction="vertical" style={{width: '100%'}}>
                            <Checkbox.Group
                                value={selectedRatings}
                                onChange={(values) => onRatingsChange(values as number[])}
                                style={{width: '100%'}}
                            >
                                <Space direction="vertical" size="small" style={{width: '100%'}}>
                                    {uniqueRatings.map(rating => (
                                        <Checkbox key={rating} value={rating}>
                                            {rating} {t("history.stars") || "stars"}
                                        </Checkbox>
                                    ))}
                                </Space>
                            </Checkbox.Group>
                        </Space>
                    </div>
                }
            >
                <Button
                    size="middle"
                    type={selectedRatings.length > 0 ? 'primary' : 'default'}
                >
                    {t("history.rating") || "Rating"}
                    {selectedRatings.length > 0 && (
                        <Tag style={{marginLeft: '4px'}}>
                            {selectedRatings.length}
                        </Tag>
                    )}
                </Button>
            </Popover>

            {/* Ingredient Count Filter Popover */}
            <Popover
                title={t("history.filterByIngredients") || "Filter by Ingredient Count"}
                trigger="click"
                content={
                    <div style={{width: 200, maxHeight: '300px', overflowY: 'auto'}}>
                        <Space direction="vertical" style={{width: '100%'}}>
                            <Checkbox.Group
                                value={selectedIngredientCounts}
                                onChange={(values) => onIngredientCountsChange(values as string[])}
                                style={{width: '100%'}}
                            >
                                <Space direction="vertical" size="small" style={{width: '100%'}}>
                                    {uniqueIngredientRanges.map(range => (
                                        <Checkbox key={range} value={range}>
                                            {range} {t("history.ingredients") || "ingredients"}
                                        </Checkbox>
                                    ))}
                                </Space>
                            </Checkbox.Group>
                        </Space>
                    </div>
                }
            >
                <Button
                    size="middle"
                    type={selectedIngredientCounts.length > 0 ? 'primary' : 'default'}
                >
                    {t("history.ingredients") || "Ingredients"}
                    {selectedIngredientCounts.length > 0 && (
                        <Tag style={{marginLeft: '4px'}}>
                            {selectedIngredientCounts.length}
                        </Tag>
                    )}
                </Button>
            </Popover>

            {/* Clear Filters Button */}
            <Button
                size="middle"
                onClick={onClearFilters}
                disabled={selectedUsers.length === 0 && selectedRatings.length === 0 && selectedIngredientCounts.length === 0}
            >
                {t("history.clearFilters") || "Clear Filters"}
            </Button>
        </Space>
    );
}
