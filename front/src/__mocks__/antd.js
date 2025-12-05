const React = require('react');

module.exports = {
    Button: ({ children, onClick, disabled, type, icon, block, danger, ...props }) => {
        const handleClick = (e) => {
            if (onClick && !disabled) {
                onClick(e);
            }
        };
        return React.createElement('button', {
            onClick: handleClick,
            disabled,
            'data-testid': props['data-testid'],
            className: `ant-btn ${type === 'primary' ? 'ant-btn-primary' : ''} ${block ? 'ant-btn-block' : ''} ${danger ? 'ant-btn-dangerous' : ''}`
        }, icon, children);
    },
    Input: Object.assign(
        ({ value, onChange, placeholder, ...props }) => (
            React.createElement('input', { value, onChange, placeholder, ...props })
        ),
        {
            Group: ({ children, compact }) => (
                React.createElement('div', { style: { display: 'flex' } }, children)
            ),
        }
    ),
    InputNumber: ({ value, onChange, min, max, style, ...props }) => {
        const handleChange = (e) => {
            const val = e.target.value;
            if (val === '' || val === null || val === undefined) {
                onChange(null);
            } else {
                const numVal = parseInt(val, 10);
                onChange(isNaN(numVal) ? null : numVal);
            }
        };
        return React.createElement('input', {
            type: 'number',
            role: 'spinbutton',
            value: value || '',
            onChange: handleChange,
            min,
            max,
            style,
            ...props
        });
    },
    Form: {
        Item: ({ children, label }) => (
            React.createElement('div', null,
                label && React.createElement('label', null, label),
                children
            )
        ),
    },
    Radio: Object.assign(
        ({ children, value, checked, onChange }) => (
            React.createElement('label', null,
                React.createElement('input', {
                    type: 'radio',
                    value,
                    checked,
                    onChange
                }),
                children
            )
        ),
        {
            Group: ({ children, value, onChange }) => (
                React.createElement('div', { role: 'radiogroup' },
                    React.Children.map(children, (child) =>
                        React.cloneElement(child, {
                            checked: child.props.value === value,
                            onChange: () => onChange({ target: { value: child.props.value } }),
                        })
                    )
                )
            ),
        }
    ),
    Switch: ({ checked, onChange, checkedChildren, unCheckedChildren }) => (
        React.createElement('button', {
            role: 'switch',
            'aria-checked': checked,
            onClick: () => onChange(!checked)
        }, checked ? checkedChildren : unCheckedChildren)
    ),
    Space: ({ children, wrap }) => React.createElement('div', null, children),
    Collapse: ({ items }) => (
        React.createElement('div', null,
            items?.map((item, index) => (
                React.createElement('div', { key: item.key || index },
                    React.createElement('div', null, item.label),
                    React.createElement('div', null, item.children)
                )
            ))
        )
    ),
    Spin: () => React.createElement('div', { role: 'status' }, 'Loading...'),
    List: Object.assign(
        ({ children, dataSource, renderItem }) => (
            React.createElement('div', null,
                dataSource
                    ? dataSource.map((item, index) => (
                          React.createElement('div', { key: index }, renderItem(item, index))
                      ))
                    : children
            )
        ),
        {
            Item: ({ children, style }) => React.createElement('div', { style }, children),
        }
    ),
    Row: ({ children, gutter, style }) => React.createElement('div', { style }, children),
    Col: ({ children, span, style }) => React.createElement('div', { style }, children),
    Rate: ({ value, onChange, disabled, style }) => {
        const handleChange = (starValue, event) => {
            if (!disabled && onChange) {
                // Call onChange synchronously to ensure it's called
                onChange(starValue);
            }
        };
        return React.createElement('div', { style, 'data-testid': 'rate-component' },
            [1, 2, 3, 4, 5].map((star) => (
                React.createElement('input', {
                    key: star,
                    type: 'radio',
                    role: 'radio',
                    'data-rating': star,
                    checked: star === value,
                    disabled: disabled,
                    onClick: (e) => handleChange(star, e),
                    onChange: (e) => handleChange(star, e)
                })
            ))
        );
    },
    Tag: ({ children, color, style }) => React.createElement('span', { style }, children),
    Card: ({ children, title, style }) => (
        React.createElement('div', { style },
            title && React.createElement('div', null, title),
            children
        )
    ),
};
