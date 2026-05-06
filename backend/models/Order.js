class Order {
    constructor(db) {
        this.db = db;
    }
    
    async create(orderData) {
        const { userId, ageGroup, childrenCount, gender, theme, animatorsCount, extras, totalPrice, eventDate } = orderData;
        
        const result = await this.db.run(
            `INSERT INTO orders 
             (user_id, age_group, children_count, gender, theme, animators_count, extras, total_price, event_date) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, ageGroup, childrenCount, gender, theme, animatorsCount, JSON.stringify(extras), totalPrice, eventDate]
        );
        
        return { id: result.lastID };
    }
    
    async getUserOrders(userId) {
        return await this.db.all(`SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`, [userId]);
    }
}

module.exports = Order;