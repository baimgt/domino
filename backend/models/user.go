package models

import "go.mongodb.org/mongo-driver/bson/primitive"

// User merepresentasikan skema koleksi pemain di database MongoDB
type User struct {
	ID       primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Username string             `bson:"username" json:"username"`
	Avatar   string             `bson:"avatar" json:"avatar"`
	Coins    int64              `bson:"coins" json:"coins"`
	RP       int64              `bson:"rp" json:"rp"`
	Score    float64            `bson:"score" json:"score"`
}
