/**
 * 导出服务
 */

import { Subscription } from '../types';

export class ExportService {
    /**
     * 导出为 JSON 格式
     */
    static exportToJSON(subscriptions: Subscription[]): string {
        return JSON.stringify(subscriptions, null, 2);
    }

    /**
     * 导出为 CSV 格式
     */
    static exportToCSV(subscriptions: Subscription[]): string {
        if (subscriptions.length === 0) {
            return '';
        }

        // CSV 表头
        const headers = [
            'name',
            'customType',
            'startDate',
            'expiryDate',
            'periodValue',
            'periodUnit',
            'price',
            'reminderDays',
            'notes',
            'isActive',
            'autoRenew',
            'useLunar',
        ];

        // CSV 行
        const rows = subscriptions.map((sub) => {
            return [
                this.escapeCsvValue(sub.name),
                this.escapeCsvValue(sub.customType || ''),
                sub.startDate || '',
                sub.expiryDate,
                sub.periodValue?.toString() || '',
                sub.periodUnit || '',
                sub.price?.toString() || '',
                sub.reminderDays?.toString() || '',
                this.escapeCsvValue(sub.notes || ''),
                sub.isActive.toString(),
                sub.autoRenew.toString(),
                (sub.useLunar || false).toString(),
            ].join(',');
        });

        return [headers.join(','), ...rows].join('\n');
    }

    /**
     * 转义 CSV 值
     */
    private static escapeCsvValue(value: string): string {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }

    /**
     * 从 CSV 导入
     */
    static importFromCSV(csvContent: string): Partial<Subscription>[] {
        const lines = csvContent.split('\n').filter((line) => line.trim());
        if (lines.length < 2) {
            throw new Error('CSV 文件格式错误');
        }

        const headers = lines[0].split(',').map((h) => h.trim());
        const subscriptions: Partial<Subscription>[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCsvLine(lines[i]);
            const subscription: Partial<Subscription> = {};

            headers.forEach((header, index) => {
                const value = values[index];
                if (!value) return;

                switch (header) {
                    case 'name':
                        subscription.name = value;
                        break;
                    case 'customType':
                        subscription.customType = value;
                        break;
                    case 'startDate':
                        subscription.startDate = value || null;
                        break;
                    case 'expiryDate':
                        subscription.expiryDate = value;
                        break;
                    case 'periodValue':
                        subscription.periodValue = parseInt(value, 10);
                        break;
                    case 'periodUnit':
                        subscription.periodUnit = value as 'year' | 'month' | 'day';
                        break;
                    case 'price':
                        subscription.price = parseFloat(value);
                        break;
                    case 'reminderDays':
                        subscription.reminderDays = parseInt(value, 10);
                        break;
                    case 'notes':
                        subscription.notes = value;
                        break;
                    case 'isActive':
                        subscription.isActive = value === 'true';
                        break;
                    case 'autoRenew':
                        subscription.autoRenew = value === 'true';
                        break;
                    case 'useLunar':
                        subscription.useLunar = value === 'true';
                        break;
                }
            });

            if (subscription.name && subscription.expiryDate) {
                subscriptions.push(subscription);
            }
        }

        return subscriptions;
    }

    /**
     * 解析 CSV 行（处理引号内的逗号）
     */
    private static parseCsvLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    // 转义的引号
                    current += '"';
                    i++;
                } else {
                    // 切换引号状态
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current.trim());
        return result;
    }

    /**
     * 创建备份
     */
    static createBackup(subscriptions: Subscription[], config: unknown): string {
        return JSON.stringify(
            {
                version: '2.0.0',
                timestamp: new Date().toISOString(),
                subscriptions,
                config,
            },
            null,
            2
        );
    }

    /**
     * 从备份恢复
     */
    static restoreFromBackup(backupContent: string): {
        subscriptions: Subscription[];
        config: unknown;
        version: string;
    } {
        try {
            const data = JSON.parse(backupContent);
            return {
                subscriptions: data.subscriptions || [],
                config: data.config || {},
                version: data.version || 'unknown',
            };
        } catch (error) {
            throw new Error('备份文件格式错误');
        }
    }
}
