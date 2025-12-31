import React, { useState } from "react";
import { Card, Form, Input, Button, Spin, Modal, message } from "antd";
import {
  DownloadOutlined,
  UploadOutlined,
  CopyOutlined,
  BgColorsOutlined,
} from "@ant-design/icons";
import "../SettingsView.css";

interface SessionSettingsSectionProps {
  t: (key: string) => string;
  sessionWaiting: boolean;
  sessionName: string;
  session: any;
  sessionSaving: boolean;
  exporting: boolean;
  sessionKey: string;
  onSessionNameChanged: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveSessionName: () => void;
  onExportIngredients: () => void;
  setImportModalVisible: (visible: boolean) => void;
  onCloseSession: () => void;
}

export function SessionSettingsSection(props: SessionSettingsSectionProps) {
  const {
    t,
    sessionWaiting,
    sessionName,
    session,
    sessionSaving,
    exporting,
    sessionKey,
    onSessionNameChanged,
    onSaveSessionName,
    onExportIngredients,
    setImportModalVisible,
    onCloseSession,
  } = props;

  const [isPromptModalVisible, setIsPromptModalVisible] = useState(false);

  const promptContent = `You are a helpful culinary assistant. Based on the list of ingredients I provided you with, please transform the ingredients into the following structure. Please fill out the meta-data of the ingredients.

Here is the JSON structure format for ingredients by example of a tomato and chicken breast.

\`\`\`json
{
  "ingredients": [
    {
      "id": 1,
      "name": "Tomato",
      "type": 1,
      "available": true,
      "meat": false,
      "vegetarian": false,
      "vegan": true,
      "fish": false,
      "gluten": false,
      "histamine": false,
      "fructose": false,
      "lactose": false,
      "spicy": 0,
      "wildcard": false,
      "sweet": false
    },
    {
      "id": 2,
      "name": "Chicken Breast",
      "type": 1,
      "available": true,
      "meat": true,
      "vegetarian": false,
      "vegan": false,
      "fish": false,
      "gluten": false,
      "histamine": false,
      "fructose": false,
      "lactose": false,
      "spicy": 0,
      "wildcard": false,
      "sweet": false
    }
  ]
}
\`\`\`

Field explanations:
- id: Unique identifier (optional for new ingredients)
- name: Name of the ingredient
- type: 1 for FILL, 2 for SAUCE
- available: Whether the ingredient is available in this import it should always be true
- meat, vegetarian, vegan, fish: Dietary categories (only one can be true!)
- gluten, histamine, fructose, lactose: Allergen/intolerance flags
- spicy: Spice level (0-3)
- wildcard: Special ingredient flag, true if the ingredient is a bold choice for raclette
- sweet: Whether the ingredient is sweet

Please now transform the list of ingredients into this format.`;

  const handleCopyPrompt = () => {
    navigator.clipboard
      .writeText(promptContent)
      .then(() => {
        message.success(
          t("settings.copiedToClipboard") || "Copied to clipboard",
        );
      })
      .catch((err) => {
        console.error("Failed to copy to clipboard:", err);
        message.error(
          t("settings.copyFailed") || "Failed to copy to clipboard",
        );
      });
  };

  return (
    <div className="settings-session-tab">
      {sessionWaiting ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "200px",
          }}
        >
          <Spin size="large" />
        </div>
      ) : (
        <>
          <Card
            className="settings-card"
            bodyStyle={{ padding: "24px" }}
            style={{ marginBottom: "24px" }}
          >
            <Form.Item
              label={
                <span className="settings-section-title">
                  {t("session.sessionName")}
                </span>
              }
              className="settings-form-item-spacing"
              labelCol={{ span: 24 }}
              wrapperCol={{ span: 24 }}
            >
              <Input
                size="large"
                value={sessionName}
                onChange={onSessionNameChanged}
                placeholder={t("common.enterName")}
                onPressEnter={onSaveSessionName}
                disabled={sessionWaiting || sessionSaving}
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                size="large"
                onClick={onSaveSessionName}
                loading={sessionSaving}
                disabled={
                  !sessionName.trim() ||
                  sessionName === session?.name ||
                  sessionWaiting
                }
                className="settings-save-button-medium"
              >
                {t("common.save") || "Save"}
              </Button>
            </Form.Item>
          </Card>

          {/* Import/Export Section */}
          <Card
            style={{
              borderRadius: "18px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              border: "none",
              marginBottom: "24px",
            }}
            bodyStyle={{ padding: "24px" }}
          >
            {/* Prompt Section */}
            <div style={{ marginBottom: "32px" }}>
              <div
                className="settings-section-title"
                style={{ marginBottom: "8px" }}
              >
                {t("settings.prompt") || "LLM Prompt"}
              </div>
              <div
                style={{
                  fontSize: "15px",
                  color: "#666",
                  marginBottom: "16px",
                  lineHeight: "1.5",
                }}
              >
                {t("settings.promptDescription") ||
                  "View the ingredient JSON structure and LLM prompt for chat."}
              </div>
              <Button
                size="large"
                icon={<BgColorsOutlined />}
                onClick={() => setIsPromptModalVisible(true)}
                block
                style={{
                  height: "44px",
                  fontSize: "17px",
                  fontWeight: 500,
                  borderRadius: "12px",
                  letterSpacing: "-0.022em",
                }}
              >
                {t("settings.viewPrompt") || "View Prompt"}
              </Button>
            </div>

            {/* Export Section */}
            <div style={{ marginBottom: "32px" }}>
              <div
                className="settings-section-title"
                style={{ marginBottom: "8px" }}
              >
                {t("settings.export") || "Export"}
              </div>
              <div
                style={{
                  fontSize: "15px",
                  color: "#666",
                  marginBottom: "16px",
                  lineHeight: "1.5",
                }}
              >
                {t("settings.exportDescription") ||
                  "View and copy all ingredients from this session as JSON."}
              </div>
              <Button
                size="large"
                icon={<DownloadOutlined />}
                onClick={onExportIngredients}
                loading={exporting}
                disabled={!sessionKey}
                block
                style={{
                  height: "44px",
                  fontSize: "17px",
                  fontWeight: 500,
                  borderRadius: "12px",
                  letterSpacing: "-0.022em",
                }}
              >
                {t("settings.export") || "Export"}
              </Button>
            </div>

            {/* Import Section */}
            <div style={{ marginBottom: 0 }}>
              <div
                style={{
                  fontSize: "17px",
                  fontWeight: 600,
                  letterSpacing: "-0.022em",
                  color: "#1d1d1f",
                  marginBottom: "8px",
                }}
              >
                {t("settings.import") || "Import"}
              </div>
              <div
                style={{
                  fontSize: "15px",
                  color: "#666",
                  marginBottom: "16px",
                  lineHeight: "1.5",
                }}
              >
                {t("settings.importDescription") ||
                  "Import ingredients from JSON. You can review and edit them before importing."}
              </div>
              <Button
                size="large"
                icon={<UploadOutlined />}
                onClick={() => setImportModalVisible(true)}
                disabled={!sessionKey}
                block
                style={{
                  height: "44px",
                  fontSize: "17px",
                  fontWeight: 500,
                  borderRadius: "12px",
                  letterSpacing: "-0.022em",
                }}
              >
                {t("settings.import") || "Import"}
              </Button>
            </div>
          </Card>

          <Card className="settings-card" bodyStyle={{ padding: "24px" }}>
            <Form.Item
              label={
                <span
                  style={{
                    fontSize: "17px",
                    fontWeight: 600,
                    letterSpacing: "-0.022em",
                    color: "#1d1d1f",
                  }}
                >
                  {t("session.eveningOver")}
                </span>
              }
              style={{ marginBottom: 0 }}
              labelCol={{ span: 24 }}
              wrapperCol={{ span: 24 }}
            >
              <Button
                type="primary"
                danger
                block
                size="large"
                onClick={onCloseSession}
                style={{
                  height: "44px",
                  fontSize: "17px",
                  fontWeight: 500,
                  borderRadius: "12px",
                  letterSpacing: "-0.022em",
                }}
              >
                {t("session.endSession")}
              </Button>
            </Form.Item>
          </Card>
        </>
      )}

      {/* Prompt Modal */}
      <Modal
        title={t("settings.llmPrompt") || "LLM Prompt"}
        open={isPromptModalVisible}
        onCancel={() => setIsPromptModalVisible(false)}
        footer={[
          <Button
            key="copy"
            icon={<CopyOutlined />}
            onClick={handleCopyPrompt}
            style={{ width: "100%" }}
          >
            {t("settings.copyPrompt") || "Copy Prompt"}
          </Button>,
          <Button
            key="close"
            onClick={() => setIsPromptModalVisible(false)}
            style={{ width: "100%", marginTop: "8px" }}
          >
            {t("auth.close") || "Close"}
          </Button>,
        ]}
        width={700}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ fontSize: "14px", color: "#666" }}>
            {t("settings.promptModalDescription") ||
              "Copy this prompt and paste it into your LLM chat along with your exported ingredients JSON."}
          </div>
          <Input.TextArea
            value={promptContent}
            readOnly
            rows={20}
            style={{
              fontFamily: "monospace",
              fontSize: "12px",
              backgroundColor: "#f5f5f5",
            }}
          />
        </div>
      </Modal>
    </div>
  );
}
