import { describe, it, expect } from 'vitest';
import { distributeWechatBotNotifications, distributeEmailNotifications } from '../../src/services/notification';
import { Subscription, Config } from '../../src/types';

describe('Distribution Expansion', () => {
    const mockConfig: Config = {
        enabledNotifiers: ['wechatbot', 'email'],
        wechatBot: {
            webhook: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=key1|https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=key2',
            msgType: 'text'
        },
        email: {
            resendApiKey: 'test',
            fromEmail: 'test@from.com',
            toEmail: 'global1@test.com|global2@test.com'
        }
    };

    const mockSubs: Subscription[] = [
        { id: '1', name: 'Global Sub', expiryDate: '2025-01-01T00:00:00Z', isActive: true, autoRenew: true },
        { id: '2', name: 'Bot1 Sub', expiryDate: '2025-01-01T00:00:00Z', isActive: true, autoRenew: true, wechatBotKeys: 'key1' },
        { id: '3', name: 'Email1 Sub', expiryDate: '2025-01-01T00:00:00Z', isActive: true, autoRenew: true, emailAddresses: 'user1@test.com' },
        { id: '4', name: 'Mixed Sub', expiryDate: '2025-01-01T00:00:00Z', isActive: true, autoRenew: true, wechatBotKeys: 'key2', emailAddresses: 'user2@test.com' }
    ];

    describe('distributeWechatBotNotifications', () => {
        it('should distribute to global when no keys specified', () => {
            const result = distributeWechatBotNotifications([mockSubs[0]], mockConfig);
            expect(result.size).toBe(2);
            expect(result.get('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=key1')).toContain(mockSubs[0]);
            expect(result.get('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=key2')).toContain(mockSubs[0]);
        });

        it('should direct to specific bot key', () => {
            const result = distributeWechatBotNotifications([mockSubs[1]], mockConfig);
            expect(result.size).toBe(1);
            expect(result.has('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=key1')).toBe(true);
            expect(result.has('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=key2')).toBe(false);
        });

        it('should handle mixed distributions', () => {
            const result = distributeWechatBotNotifications(mockSubs, mockConfig);
            // Sub 1 -> Bot1, Bot2
            // Sub 2 -> Bot1
            // Sub 3 -> Bot1, Bot2 (Default)
            // Sub 4 -> Bot2
            expect(result.get('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=key1')?.length).toBe(3); // 1, 2, 3
            expect(result.get('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=key2')?.length).toBe(3); // 1, 3, 4
        });
    });

    describe('distributeEmailNotifications', () => {
        it('should distribute to global when no emails specified', () => {
            const result = distributeEmailNotifications([mockSubs[0]], mockConfig);
            expect(result.size).toBe(2);
            expect(result.has('global1@test.com')).toBe(true);
            expect(result.has('global2@test.com')).toBe(true);
        });

        it('should direct to specific email', () => {
            const result = distributeEmailNotifications([mockSubs[2]], mockConfig);
            expect(result.size).toBe(1);
            expect(result.has('user1@test.com')).toBe(true);
        });

        it('should handle mixed email distributions', () => {
            const result = distributeEmailNotifications(mockSubs, mockConfig);
            // Sub 1 -> Global1, Global2
            // Sub 2 -> Global1, Global2 (Default)
            // Sub 3 -> user1
            // Sub 4 -> user2
            expect(result.get('global1@test.com')?.length).toBe(2); // 1, 2
            expect(result.get('user1@test.com')?.length).toBe(1); // 3
            expect(result.get('user2@test.com')?.length).toBe(1); // 4
        });
    });
});
