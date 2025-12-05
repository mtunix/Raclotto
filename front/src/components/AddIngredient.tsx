import React, {useState} from "react";
import {Button, Form, Input, Radio, Space, Switch} from "antd";
import {Api} from "../lib/api";
import {IngredientType} from "../model/ingredient";
import {useTranslation} from "react-i18next";

type AddIngredientProps = {
    session: string;
    onAdd: () => void;
};

export function AddIngredient(props: AddIngredientProps) {
    let { t } = useTranslation();
    let options = [
        {"name": "meat", "key": "tags.meat"},
        {"name": "vegetarian", "key": "tags.vegetarian"},
        {"name": "vegan", "key": "tags.vegan"},
        {"name": "histamine", "key": "tags.histamine"},
        {"name": "gluten", "key": "tags.gluten"},
        {"name": "fructose", "key": "tags.fructose"},
        {"name": "lactose", "key": "tags.lactose"},
    ];

    let [meat, setMeat] = useState(false);
    let [vegetarian, setVegetarian] = useState(true);
    let [vegan, setVegan] = useState(false);
    let [gluten, setGluten] = useState(false);
    let [histamine, setHistamine] = useState(false);
    let [fructose, setFructose] = useState(false);
    let [lactose, setLactose] = useState(false);
    let [name, setName] = useState("");
    let [type, setType] = useState(IngredientType.FILL);

    function setChecked(optionName: string, checked: boolean) {
        switch (optionName) {
            case "vegetarian":
                if (!checked) {
                    setVegan(true);
                }
                setVegetarian(checked);
                break;
            case "meat":
                if (!checked) {
                    setVegan(true);
                    setVegetarian(true);
                }
                setMeat(checked);
                break;
            case "vegan":
                setVegan(checked);
                break;
            case "gluten":
                setGluten(checked);
                break;
            case "histamine":
                setHistamine(checked);
                break;
            case "fructose":
                setFructose(checked);
                break;
            case "lactose":
                setLactose(checked);
                break;
        }
    }

    function onNameChanged(e: React.ChangeEvent<HTMLInputElement>) {
        setName(e.target.value);
    }

    function onAddClicked() {
        let ingredientData = {
            name: name,
            type: type,
            meat: meat,
            vegetarian: vegetarian,
            vegan: vegan,
            gluten: gluten,
            histamine: histamine,
            fructose: fructose,
            lactose: lactose
        };

        Api.add(props.session, ingredientData).then(() => {
            props.onAdd();
            setName("");
        });
    }

    function onIngredientSelected(value: IngredientType) {
        setType(value);
    }

    function getValue(optionName: string): boolean {
        switch (optionName) {
            case "meat": return meat;
            case "vegetarian": return vegetarian;
            case "vegan": return vegan;
            case "gluten": return gluten;
            case "histamine": return histamine;
            case "fructose": return fructose;
            case "lactose": return lactose;
            default: return false;
        }
    }

    return (
        <div>
            <Form.Item label={t("ingredient.ingredientName")}>
                <Input
                    value={name}
                    onChange={onNameChanged}
                    placeholder={t("common.enterName")}
                />
            </Form.Item>
            <Form.Item label={t("ingredient.type")}>
                <Radio.Group value={type} onChange={(e) => onIngredientSelected(e.target.value)}>
                    <Radio value={IngredientType.FILL}>{t("ingredient.fill")}</Radio>
                    <Radio value={IngredientType.SAUCE}>{t("ingredient.sauce")}</Radio>
                </Radio.Group>
            </Form.Item>
            <Form.Item label={t("ingredient.contains")}>
                <Space wrap>
                    {options.map((option) => (
                        <Switch
                            key={option.name}
                            checked={getValue(option.name)}
                            onChange={(checked) => setChecked(option.name, checked)}
                            checkedChildren={t(option.key)}
                            unCheckedChildren={t(option.key)}
                        />
                    ))}
                </Space>
            </Form.Item>
            <Button
                type="primary"
                block
                disabled={name.length === 0}
                onClick={onAddClicked}
                style={{ marginTop: '8px' }}
            >
                {t("common.create")}
            </Button>
        </div>
    );
}

