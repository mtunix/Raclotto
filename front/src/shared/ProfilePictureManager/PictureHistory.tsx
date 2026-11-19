import type { ReactNode, CSSProperties } from "react";
import { Avatar, Button, Collapse, Spin } from "antd";
import { useTranslation } from "react-i18next";
import type { ProfilePictureDto } from "../../api/generated/model";
import { getProfilePictureUrl } from "../../lib/utils/profilePictureUrl";

const CANDIDATE_BLUE = "#1890ff";

const takenAt = (createdAt: string) =>
  new Date(createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

interface PictureHistoryProps {
  history: ProfilePictureDto[];
  loading: boolean;
  /** Offered for the user's own pictures: make one the candidate, which also highlights the current one. */
  onChoose?: (pictureId: number) => void;
  /** The picture being made the candidate; every choice waits for it. */
  choosing?: number | null;
  /** Shown instead of the list when there are no pictures. */
  whenEmpty?: ReactNode;
  style?: CSSProperties;
}

/** A user's pictures, newest first, in a collapsed panel. */
export function PictureHistory({ history, loading, onChoose, choosing = null, whenEmpty = null, style }: PictureHistoryProps) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        <Spin />
      </div>
    );
  }
  if (history.length === 0) return whenEmpty;
  return (
    <Collapse
      style={style}
      items={[
        {
          key: "1",
          label: `${t("profile.pictureHistory") || "Profile Picture History"} (${history.length})`,
          children: (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {history.map((entry) => (
                <HistoryEntry key={entry.id} entry={entry} onChoose={onChoose} choosing={choosing} />
              ))}
            </div>
          ),
        },
      ]}
    />
  );
}

interface HistoryEntryProps {
  entry: ProfilePictureDto;
  onChoose?: (pictureId: number) => void;
  choosing: number | null;
}

function HistoryEntry({ entry, onChoose, choosing }: HistoryEntryProps) {
  const { t } = useTranslation();
  const highlighted = !!onChoose && entry.is_candidate;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        padding: "12px",
        border: highlighted ? `2px solid ${CANDIDATE_BLUE}` : "1px solid #f0f0f0",
        borderRadius: "4px",
        backgroundColor: highlighted ? "#f5f7ff" : "transparent",
      }}
    >
      <Avatar
        size={200}
        src={getProfilePictureUrl(entry.profile_picture)}
        style={{ border: highlighted ? `3px solid ${CANDIDATE_BLUE}` : "2px solid #d9d9d9" }}
      />
      <div style={{ textAlign: "center", fontSize: "12px", color: "#666" }}>
        <div>{takenAt(entry.created_at)}</div>
        {entry.level && (
          <div>
            Level: {t(entry.level.name)} (ID: {entry.level_id})
          </div>
        )}
        {highlighted && (
          <div style={{ marginTop: "4px", color: CANDIDATE_BLUE, fontWeight: "bold" }}>
            ✓ {t("image.generationCandidate") || "Generation Candidate"}
          </div>
        )}
      </div>
      {onChoose && (
        <Button
          size="small"
          onClick={() => onChoose(entry.id)}
          disabled={entry.is_candidate || choosing !== null}
          loading={choosing === entry.id}
        >
          {entry.is_candidate
            ? t("image.candidateSelected") || "Selected"
            : t("image.setAsCandidate") || "Set as Candidate"}
        </Button>
      )}
    </div>
  );
}
