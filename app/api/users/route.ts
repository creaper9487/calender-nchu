import { NextResponse } from "next/server";
import clientPromise from "../../../lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("test");
    const users = await db.collection("users").find({}).toArray();
    return NextResponse.json(users);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Error fetching users" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("test");
    const { email, availableTime } = await request.json();
    const newUser = await db
      .collection("users")
      .insertOne({ email, availableTime });
    return NextResponse.json(newUser);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error creating user" }, { status: 500 });
  }
}
