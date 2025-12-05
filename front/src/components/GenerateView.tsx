import React, {useState} from "react";
import {Button, List, Row, Col, Form, Rate, Spin} from "antd";
import {DialView} from "./DialView";
import {Api} from "../lib/api";
import {Ingredient} from "../model/ingredient";
import {Pan} from "../model/pan";
import {Util} from "../lib/util";
import {IngredientType} from "../model/ingredient";
import {useTranslation} from "react-i18next";

type GenerateViewProps = {
    session: string;
    ingredients: Ingredient[];
    onGeneration: (numFill: number, numSauce: number) => void;
};

export function GenerateView(props: GenerateViewProps) {
    let { t } = useTranslation();
    function getLocal(key: string): number {
        let value = localStorage.getItem(key);
        if (value) {
            return parseInt(value);
        }
        return 1;
    }

    let [numFill, setNumFill] = useState(getLocal("numFill"));
    let [numSauce, setNumSauce] = useState(getLocal("numSauce"));
    let [generated, setGenerated] = useState<Pan | null>(null);
    let [waiting, setWaiting] = useState(false);

    function restart() {
        setNumFill(getLocal("numFill"));
        setNumSauce(getLocal("numSauce"));
        setGenerated(null);
    }

    function getView() {
        if (!generated) return null;

        let ingredients = generated.ingredients.map((ingredient, index) => (
            <List.Item
                key={index}
                style={{
                    backgroundColor: ingredient.type === IngredientType.FILL ? '#e6f7ff' : '#f0f0f0',
                    marginBottom: '8px'
                }}
            >
                {ingredient.name}
            </List.Item>
        ));

        return (
            <div style={{ marginTop: '16px' }}>
                <List>{ingredients}</List>
                <Row>
                    <Col span={24}>
                        <Button block onClick={restart}>{t("generate.rollAnotherDice")}</Button>
                    </Col>
                </Row>
            </div>
        );
    }

    function onRating(rating: number) {
        if (generated) {
            Api.rate(props.session, generated.id, rating).then((data: any) => {
                console.log(data);
            });
        }
    }

    function onGenerateClicked() {
        setWaiting(true);
        localStorage.setItem("numFill", String(numFill));
        localStorage.setItem("numSauce", String(numSauce));
        Api.generate(props.session, numFill, numSauce).then((data: any) => {
            setGenerated(data["generated"]);
            setWaiting(false);
        });
        props.onGeneration(numFill, numSauce);
    }

    function getRating() {
        if (!generated) return null;

        return (
            <Rate
                onChange={onRating}
                style={{ marginBottom: '8px' }}
            />
        );
    }

    function canGenerate(): boolean {
        if (!Util.isNumeric(numFill) || !Util.isNumeric(numSauce)) {
            return false;
        }

        return numFill > 0
            && numSauce > 0
            && numFill <= props.ingredients.filter(i => i.type === IngredientType.FILL).length
            && numSauce <= props.ingredients.filter(i => i.type === IngredientType.SAUCE).length;
    }

    if (waiting) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                <Spin size="large" />
            </div>
        );
    }

    if (generated) {
        return (
            <div>
                <Row>
                    <Col span={18}>
                        <h3>{generated.name}</h3>
                    </Col>
                    <Col span={6} style={{ textAlign: 'right' }}>
                        {getRating()}
                    </Col>
                </Row>
                <Row>
                    {getView()}
                </Row>
            </div>
        );
    }

    return (
        <div>
            <Row gutter={16} style={{ marginBottom: '16px' }}>
                <Col span={12}>
                    <Form.Item label={t("ingredient.ingredientCount")}>
                        <DialView
                            ingredients={props.ingredients.filter(i => i.type === IngredientType.FILL)}
                            onChange={(v) => setNumFill(v)}
                            num={numFill}
                        />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item label={t("ingredient.sauceCount")}>
                        <DialView
                            ingredients={props.ingredients.filter(i => i.type === IngredientType.SAUCE)}
                            onChange={(v) => setNumSauce(v)}
                            num={numSauce}
                        />
                    </Form.Item>
                </Col>
            </Row>
            <Row>
                <Col span={24}>
                    <Button
                        type="primary"
                        block
                        disabled={!canGenerate()}
                        onClick={onGenerateClicked}
                        style={{ marginTop: '8px' }}
                    >
                        {t("common.create")}
                    </Button>
                </Col>
            </Row>
        </div>
    );
}

