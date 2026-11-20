import type { ReactNode } from "react";
import { Avatar, Button, Collapse, Spin } from "antd";
import { useTranslation } from "react-i18next";
import type { ProfilePictureDto } from "../../api/generated/model";
import { formatDate, useLanguage } from "../../lib/language";
import { getProfilePictureUrl } from "../../lib/utils/profilePictureUrl";
import "./ProfilePictureManager.css";


const TAKEN_AT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

interface PictureHistoryProps {
  history: ProfilePictureDto[];
  loading: boolean;
  /** Offered for the user's own pictures: make one the candidate, which also highlights the current one. */
  onChoose?: (pictureId: number) => void;
  /** The picture being made the candidate; every choice waits for it. */
  choosing?: number | null;
  /** Shown instead of the list when there are no pictures. */
  whenEmpty?: ReactNode;
  className?: string;
}

/** A user's pictures, newest first, in a collapsed panel. */
export function PictureHistory({ history, loading, onChoose, choosing = null, whenEmpty = null, className }: PictureHistoryProps) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <div className="picture-history-loading">
        <Spin />
      </div>
    );
  }
  if (history.length === 0) return whenEmpty;
  return (
    <Collapse
      className={className}
      items={[
        {
          key: "1",
          label: `${t("profile.pictureHistory")} (${history.length})`,
          children: (
            <div className="stack-16">
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
  const language = useLanguage();
  const highlighted = !!onChoose && entry.is_candidate;
  return (
    <div className={highlighted ? "picture-history-entry picture-history-candidate" : "picture-history-entry"}>
      <Avatar
        size={200}
        src={getProfilePictureUrl(entry.profile_picture)}
        className="picture-history-avatar"
      />
      <div className="picture-history-meta">
        <div>{formatDate(entry.created_at, language, TAKEN_AT)}</div>
        {entry.level && (
          <div>
            {t("profile.level")}: {t(entry.level.name)} (ID: {entry.level_id})
          </div>
        )}
        {highlighted && (
          <div className="picture-history-candidate-label">
            ✓ {t("image.generationCandidate")}
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
            ? t("image.candidateSelected")
            : t("image.setAsCandidate")}
        </Button>
      )}
    </div>
  );
}
