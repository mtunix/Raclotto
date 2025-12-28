import React, { useState, useRef, useEffect } from 'react';
import { Form, Input, Button, Card, Alert, Space, Upload, Avatar, Row, Col, Radio, Slider, Checkbox, message } from 'antd';
import { CameraOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Api } from '../../../lib/api';
import { useAuthStore } from '../../../AuthSlice';
import { useAppStore } from '../../../AppSlice';
import { useTranslation } from 'react-i18next';
import { TagChipGroup } from '../../../shared/components/common/TagChipGroup';
import { ExclusiveTagChipGroup } from '../../../shared/components/common/ExclusiveTagChipGroup';
import { MultiTagChipGroup } from '../../../shared/components/common/MultiTagChipGroup';
import { IngredientType } from '../../../model/ingredient';
import { mutateIngredients } from '../../../lib/api/swrHooks';

interface AddIngredientProps {
    onSuccess?: () => void;
    initialType?: IngredientType;
}

export function AddIngredient(props?: AddIngredientProps) {
    let { t } = useTranslation();
    const session = useAppStore((state) => state.session);
    const sessionKey = session?.key || "";
    
    // Exclusive category: only one can be selected (meat, vegetarian, or vegan)
    let [category, setCategory] = useState<string | null>("vegetarian");
    
    // Allergens: multiple can be selected
    let [gluten, setGluten] = useState(false);
    let [histamine, setHistamine] = useState(false);
    let [fructose, setFructose] = useState(false);
    let [lactose, setLactose] = useState(false);
    
    // Additional ingredient properties
    let [spicy, setSpicy] = useState(0);
    let [wildcard, setWildcard] = useState(false);
    let [sweet, setSweet] = useState(false);
    
    let [name, setName] = useState("");
    let [type, setType] = useState(props?.initialType || IngredientType.FILL);

    // Update type when initialType prop changes
    useEffect(() => {
        if (props?.initialType !== undefined) {
            setType(props.initialType);
        }
    }, [props?.initialType]);

    function handleCategoryChange(selectedCategory: string | null) {
        setCategory(selectedCategory);
    }

    function handleAllergenChange(optionName: string, checked: boolean) {
        switch (optionName) {
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
        // Convert exclusive category to boolean flags
        const meat = category === "meat";
        const vegetarian = category === "vegetarian";
        const vegan = category === "vegan";
        const fish = category === "fish";
        
        let ingredientData = {
            name: name,
            type: type,
            meat: meat,
            vegetarian: vegetarian,
            vegan: vegan,
            fish: fish,
            gluten: gluten,
            histamine: histamine,
            fructose: fructose,
            lactose: lactose,
            spicy: spicy,
            wildcard: wildcard,
            sweet: sweet
        };

        if (!sessionKey) return;
        Api.add(sessionKey, ingredientData).then(() => {
            // Clear form fields
            setName("");
            setCategory("vegetarian");
            setGluten(false);
            setHistamine(false);
            setFructose(false);
            setLactose(false);
            setSpicy(0);
            setWildcard(false);
            setSweet(false);
            setType(props?.initialType || IngredientType.FILL);
            
            // Invalidate cache to trigger refetch and update UI
            mutateIngredients(sessionKey);
            
            // Show success message
            message.success(t("ingredient.added") || "Ingredient added successfully");
            
            // Call onSuccess callback if provided
            if (props?.onSuccess) {
                props.onSuccess();
            }
        }).catch((error) => {
            console.error("Failed to add ingredient:", error);
            message.error(t("ingredient.addFailed") || "Failed to add ingredient");
        });
    }

    function onIngredientSelected(value: IngredientType) {
        setType(value);
    }

    // Category options (exclusive)
    const categoryOptions = [
        {"name": "meat", "key": "tags.meat"},
        {"name": "vegetarian", "key": "tags.vegetarian"},
        {"name": "vegan", "key": "tags.vegan"},
        {"name": "fish", "key": "tags.fish"},
    ];

    // Allergen options (multi-select)
    const allergenOptions = [
        {"name": "histamine", "key": "tags.histamine"},
        {"name": "gluten", "key": "tags.gluten"},
        {"name": "fructose", "key": "tags.fructose"},
        {"name": "lactose", "key": "tags.lactose"},
    ];

    const allergenValues = {
        gluten,
        histamine,
        fructose,
        lactose
    };

    return (
        <div style={{ padding: '8px 0' }}>
            <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
                <Col span={24}>
                    <Card 
                        style={{ 
                            borderRadius: '18px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            border: 'none'
                        }}
                        bodyStyle={{ padding: '24px' }}
                    >
                        <Form.Item 
                            style={{ marginBottom: 0 }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: '#1d1d1f' }}>
                                    {t("ingredient.ingredientName")}
                                </div>
                                <Input
                                    size="large"
                                    value={name}
                                    onChange={onNameChanged}
                                    placeholder={t("common.enterName")}
                                    style={{ 
                                        fontSize: '20px',
                                        height: '44px'
                                    }}
                                />
                            </div>
                        </Form.Item>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
                <Col span={24}>
                    <Card 
                        style={{ 
                            borderRadius: '18px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            border: 'none'
                        }}
                        bodyStyle={{ padding: '24px' }}
                    >
                        <Form.Item 
                            style={{ marginBottom: 0 }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: '#1d1d1f' }}>
                                    {t("ingredient.type")}
                                </div>
                                <Radio.Group 
                                    value={type} 
                                    onChange={(e) => onIngredientSelected(e.target.value as IngredientType)}
                                    size="large"
                                >
                                    <Radio 
                                        value={IngredientType.FILL}
                                        style={{ 
                                            fontSize: '17px',
                                            letterSpacing: '-0.022em',
                                            marginRight: '24px',
                                            padding: '8px 0'
                                        }}
                                    >
                                        {t("ingredient.fill")}
                                    </Radio>
                                    <Radio 
                                        value={IngredientType.SAUCE}
                                        style={{ 
                                            fontSize: '17px',
                                            letterSpacing: '-0.022em',
                                            padding: '8px 0'
                                        }}
                                    >
                                        {t("ingredient.sauce")}
                                    </Radio>
                                </Radio.Group>
                            </div>
                        </Form.Item>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
                <Col span={24}>
                    <Card 
                        style={{ 
                            borderRadius: '18px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            border: 'none'
                        }}
                        bodyStyle={{ padding: '24px' }}
                    >
                        <Form.Item 
                            style={{ marginBottom: 0 }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: '#1d1d1f' }}>
                                    {t("ingredient.category") || "Category"}
                                </div>
                                <ExclusiveTagChipGroup
                                    options={categoryOptions}
                                    selectedValue={category}
                                    onChange={handleCategoryChange}
                                />
                            </div>
                        </Form.Item>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
                <Col span={24}>
                    <Card 
                        style={{ 
                            borderRadius: '18px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            border: 'none'
                        }}
                        bodyStyle={{ padding: '24px' }}
                    >
                        <Form.Item 
                            style={{ marginBottom: 0 }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: '#1d1d1f' }}>
                                    {t("ingredient.allergens") || "Allergens"}
                                </div>
                                <MultiTagChipGroup
                                    options={allergenOptions}
                                    values={allergenValues}
                                    onChange={handleAllergenChange}
                                />
                            </div>
                        </Form.Item>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
                <Col span={24}>
                    <Card 
                        style={{ 
                            borderRadius: '18px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            border: 'none'
                        }}
                        bodyStyle={{ padding: '24px' }}
                    >
                        <Form.Item 
                            style={{ marginBottom: 0 }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: '#1d1d1f' }}>
                                    {t("ingredient.additionalProperties") || "Additional Properties"}
                                </div>
                                
                                <div>
                                    <div style={{ marginBottom: '8px', fontSize: '17px', letterSpacing: '-0.022em' }}>
                                        {t("ingredient.spicy") || "Spicy"} ({spicy}/3)
                                    </div>
                                    <Slider
                                        min={0}
                                        max={3}
                                        value={spicy}
                                        onChange={setSpicy}
                                        marks={{ 0: '0', 1: '1', 2: '2', 3: '3' }}
                                    />
                                </div>

                                <div>
                                    <Checkbox
                                        checked={wildcard}
                                        onChange={(e) => setWildcard(e.target.checked)}
                                        style={{ fontSize: '17px', letterSpacing: '-0.022em' }}
                                    >
                                        {t("ingredient.wildcard") || "Wildcard"}
                                    </Checkbox>
                                </div>

                                <div>
                                    <Checkbox
                                        checked={sweet}
                                        onChange={(e) => setSweet(e.target.checked)}
                                        style={{ fontSize: '17px', letterSpacing: '-0.022em' }}
                                    >
                                        {t("ingredient.sweet") || "Sweet"}
                                    </Checkbox>
                                </div>
                            </div>
                        </Form.Item>
                    </Card>
                </Col>
            </Row>

            <Row>
                <Col span={24}>
                    <Button
                        type="primary"
                        block
                        size="large"
                        disabled={name.length === 0}
                        onClick={onAddClicked}
                        style={{ 
                            height: '56px',
                            fontSize: '19px',
                            fontWeight: 500,
                            borderRadius: '12px',
                            letterSpacing: '-0.022em'
                        }}
                    >
                        {t("common.create")}
                    </Button>
                </Col>
            </Row>
        </div>
    );
}

