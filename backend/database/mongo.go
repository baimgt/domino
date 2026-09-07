package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var DB *mongo.Client

// ConnectDB membuka koneksi ke server MongoDB lokal
func ConnectDB() {
	clientOptions := options.Client().ApplyURI("mongodb://localhost:27017")
	
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	
	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		log.Fatal("Gagal menghubungkan ke MongoDB: ", err)
	}

	err = client.Ping(ctx, nil)
	if err != nil {
		log.Fatal("Gagal ping ke MongoDB: ", err)
	}

	fmt.Println("Berhasil terhubung ke MongoDB!")
	DB = client
}

// GetCollection membantu mengambil referensi koleksi di database
func GetCollection(collectionName string) *mongo.Collection {
	return DB.Database("domino_db").Collection(collectionName)
}
