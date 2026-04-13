/**
 * AnonymousNamingService
 * Generates random pop-culture themed aliases for anonymous matching.
 */
export class AnonymousNamingService {
    private static readonly MARVEL_NAMES = [
        "Star-Lord", "Iron Man", "Black Widow", "Spider-Man", "Groot", "Rocket Raccoon",
        "Wanda", "Vision", "Doctor Strange", "Black Panther", "Thor", "Loki", "Hulk",
        "Captain America", "Ant-Man", "Wasp", "Deadpool", "Wolverine", "Logan"
    ];

    private static readonly DC_NAMES = [
        "Batman", "Superman", "Wonder Woman", "Flash", "Aquaman", "Cyborg", "Nightwing",
        "Batgirl", "Raven", "Starfire", "Beast Boy", "Robin", "Joker", "Harley Quinn",
        "Poison Ivy", "Catwoman", "Lex Luthor", "Shazam"
    ];

    private static readonly ANIME_NAMES = [
        "Goku", "Naruto", "Luffy", "Zoro", "Saitama", "Mikasa", "Levi", "Light Yagami",
        "Gon", "Killua", "Deku", "Bakugo", "Todoroki", "Tanjiro", "Nezuko", "Shinji Ikari",
        "Asuka", "Rei", "San", "Ashitaka"
    ];

    private static readonly SONG_NAMES = [
        "Starboy", "Moonlight", "Purple Haze", "Ziggy Stardust", "Major Tom", "Rocketman",
        "Smooth Criminal", "Billie Jean", "Roxanne", "Layla", "Jolene", "Lucid Dream",
        "Blinding Lights", "Yellow Submarine", "Bohemian Rhapsody"
    ];

    private static readonly DARK_FANTASY_NAMES = [
        "Frodo", "Gandalf", "Legolas", "Gimli", "Aragorn", "Sauron", "Saruman", "Galadriel",
        "Gollum", "Bilbo", "Thorin", "Smaug", "Witch-king", "Nazgul", "Azog"
    ];

    private static readonly ALL_NAMES = [
        ...this.MARVEL_NAMES,
        ...this.DC_NAMES,
        ...this.ANIME_NAMES,
        ...this.SONG_NAMES,
        ...this.DARK_FANTASY_NAMES
    ];

    /**
     * Generates a random name from the pop-culture collection.
     */
    static generateRandomName(): string {
        const index = Math.floor(Math.random() * this.ALL_NAMES.length);
        return this.ALL_NAMES[index];
    }
}
