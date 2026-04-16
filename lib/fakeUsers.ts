type FakeUser = {
  name: string;
  style: "concise" | "verbose" | "questioning" | "technical";
};

export const FAKE_USERS: FakeUser[] = [
  { name: "Rahul S.", style: "concise" },
  { name: "Priya K.", style: "verbose" },
  { name: "Amit Verma", style: "technical" },
  { name: "Sneha Rao", style: "questioning" },
  { name: "Deepak M.", style: "concise" },
  { name: "Kavya Nair", style: "verbose" },
  { name: "Suresh T.", style: "technical" },
  { name: "Ananya P.", style: "questioning" },
  { name: "Vikram B.", style: "concise" },
  { name: "Meera J.", style: "verbose" },
  { name: "Ravi Kumar", style: "technical" },
  { name: "Pooja S.", style: "concise" },
  { name: "Arjun D.", style: "questioning" },
  { name: "Lakshmi V.", style: "verbose" },
  { name: "Kiran R.", style: "technical" },
  { name: "Nisha G.", style: "concise" },
  { name: "Sanjay H.", style: "questioning" },
  { name: "Divya M.", style: "verbose" },
  { name: "Rajesh P.", style: "technical" },
  { name: "Sunita K.", style: "concise" },
  { name: "Arun N.", style: "questioning" },
  { name: "Bhavna S.", style: "verbose" },
  { name: "Mohan L.", style: "technical" },
  { name: "Rekha V.", style: "concise" },
  { name: "Ajay C.", style: "questioning" },
  { name: "Chitra R.", style: "verbose" },
  { name: "Prakash T.", style: "technical" },
  { name: "Asha D.", style: "concise" },
  { name: "Nikhil B.", style: "questioning" },
  { name: "Swati G.", style: "verbose" },
];

export const pickFakeUser = (): FakeUser =>
  FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)]!;

export const pickDistinctFakeUsers = (count: number): FakeUser[] => {
  const shuffled = [...FAKE_USERS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, FAKE_USERS.length));
};
