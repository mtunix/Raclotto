import React, {useState, useEffect} from "react";
import {Form, Input, Switch, Space} from "antd";
import {useTranslation} from "react-i18next";

type SettingsViewProps = {};

export function SettingsView(props: SettingsViewProps) {
    let { t } = useTranslation();
    let options = [
        {"name": "meat", "key": "tags.carnivore"},
        {"name": "vegetarian", "key": "tags.vegetarian"},
        {"name": "vegan", "key": "tags.vegan"},
        {"name": "histamine", "key": "tags.histamine"},
        {"name": "gluten", "key": "tags.gluten"},
        {"name": "fructose", "key": "tags.fructose"},
        {"name": "lactose", "key": "tags.lactose"},
    ];

    let [meat, setMeat] = useState(true);
    let [vegetarian, setVegetarian] = useState(true);
    let [vegan, setVegan] = useState(true);
    let [gluten, setGluten] = useState(true);
    let [histamine, setHistamine] = useState(true);
    let [fructose, setFructose] = useState(true);
    let [lactose, setLactose] = useState(true);
    let [name, setName] = useState("");

    useEffect(() => {
        options.forEach((opt) => {
            let value = localStorage.getItem(opt.name);
            if (value !== null) {
                let boolValue = value === 'true';
                switch (opt.name) {
                    case "meat":
                        setMeat(boolValue);
                        break;
                    case "vegetarian":
                        setVegetarian(boolValue);
                        break;
                    case "vegan":
                        setVegan(boolValue);
                        break;
                    case "gluten":
                        setGluten(boolValue);
                        break;
                    case "histamine":
                        setHistamine(boolValue);
                        break;
                    case "fructose":
                        setFructose(boolValue);
                        break;
                    case "lactose":
                        setLactose(boolValue);
                        break;
                }
            }
        });

        let storedName = localStorage.getItem("name");
        if (storedName) {
            setName(storedName);
        }
    }, []);

    function setChecked(type: string, checked: boolean) {
        switch (type) {
            case "vegetarian":
                if (!checked) {
                    setVegan(true);
                    localStorage.setItem("vegan", String(true));
                }
                setVegetarian(checked);
                localStorage.setItem("vegetarian", String(checked));
                break;
            case "meat":
                if (!checked) {
                    setVegetarian(true);
                    setVegan(true);
                    localStorage.setItem("vegetarian", String(true));
                    localStorage.setItem("vegan", String(true));
                }
                setMeat(checked);
                localStorage.setItem("meat", String(checked));
                break;
            case "vegan":
                setVegan(checked);
                localStorage.setItem("vegan", String(checked));
                break;
            case "gluten":
                setGluten(checked);
                localStorage.setItem("gluten", String(checked));
                break;
            case "histamine":
                setHistamine(checked);
                localStorage.setItem("histamine", String(checked));
                break;
            case "fructose":
                setFructose(checked);
                localStorage.setItem("fructose", String(checked));
                break;
            case "lactose":
                setLactose(checked);
                localStorage.setItem("lactose", String(checked));
                break;
        }
    }

    function onNameChanged(e: React.ChangeEvent<HTMLInputElement>) {
        setName(e.target.value);
        localStorage.setItem("name", e.target.value);
    }

    function getValue(type: string): boolean {
        switch (type) {
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
            <Form.Item label={t("settings.iAm")}>
                <Input
                    value={name}
                    onChange={onNameChanged}
                    placeholder={t("common.enterName")}
                />
            </Form.Item>
            <Form.Item label={t("settings.allOkToSnack")}>
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
        </div>
    );
}

