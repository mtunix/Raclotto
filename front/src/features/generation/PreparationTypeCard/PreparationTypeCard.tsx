import { Card, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import styles from '../GenerateView/GenerateView.module.css';
import './PreparationTypeCard.css';

const { Text } = Typography;

interface PreparationTypeCardProps {
    preparationType: {
        id: number;
        name: string;
    };
}

export function PreparationTypeCard({ preparationType }: PreparationTypeCardProps) {
    const { t } = useTranslation();
    return (
        <Card
            className={styles.card}
        >
            <div className="preparation-type-card-body">
                <div className={`${styles.flexRow} ${styles.alignCenter} ${styles.gap16}`}>
                    <div className={styles.largeIcon}>
                        🍳
                    </div>
                    <div className={`${styles.flexColumn} ${styles.gap4} ${styles.flex1}`}>
                        <Text strong className={styles.subtitle}>
                            {t("generate.preparationType")}
                        </Text>
                        <Text className="preparation-type-name">
                            {preparationType.name}
                        </Text>
                    </div>
                </div>
            </div>
        </Card>
    );
}
