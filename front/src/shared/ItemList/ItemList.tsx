import { Fragment, type CSSProperties, type Key, type ReactNode } from "react";
import { Empty, Spin } from "antd";
import "./ItemList.css";

interface ItemListProps<T> {
    items: T[];
    rowKey: (item: T) => Key;
    /** One `ItemRow` per item. */
    renderItem: (item: T, index: number) => ReactNode;
    loading?: boolean;
}

/** Rows split by a line, and antd's "No data" when there are none: what antd's deprecated List drew, as plain markup. */
export function ItemList<T>({ items, rowKey, renderItem, loading = false }: ItemListProps<T>) {
    return (
        <div className={loading ? "item-list item-list-loading" : "item-list"}>
            <Spin spinning={loading}>
                {items.length > 0 ? (
                    <ul className="item-list-rows">
                        {items.map((item, index) => (
                            <Fragment key={rowKey(item)}>{renderItem(item, index)}</Fragment>
                        ))}
                    </ul>
                ) : (
                    !loading && (
                        <div className="item-list-empty">
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        </div>
                    )
                )}
            </Spin>
        </div>
    );
}

interface ItemRowProps {
    className?: string;
    style?: CSSProperties;
    /** Controls at the row's end. */
    actions?: ReactNode;
    children: ReactNode;
}

export function ItemRow({ className, style, actions, children }: ItemRowProps) {
    return (
        <li className={className ? `item-list-row ${className}` : "item-list-row"} style={style}>
            {children}
            {actions !== undefined && (
                <ul className="item-list-row-actions">
                    <li>{actions}</li>
                </ul>
            )}
        </li>
    );
}

interface ItemMetaProps {
    avatar?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
}

/** A row's avatar, title and description. */
export function ItemMeta({ avatar, title, description }: ItemMetaProps) {
    return (
        <div className="item-list-meta">
            {avatar !== undefined && <div className="item-list-meta-avatar">{avatar}</div>}
            <div className="item-list-meta-content">
                <h4 className="item-list-meta-title">{title}</h4>
                {description !== undefined && <div className="item-list-meta-description">{description}</div>}
            </div>
        </div>
    );
}
