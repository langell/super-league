/**
 * Golf Course API Service
 * Integrates with golfapi.io or provides mock data for development.
 */

const DEFAULT_HOLE_COUNT = 18;
const DEFAULT_PAR = 72;
const MOCK_HOLE_PARS = [4, 5, 3, 4, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 5, 3, 4, 4];
const MOCK_TEMP_BASE_YARDAGE = 400;
const MOCK_MEMBER_BASE_YARDAGE = 350;
const YARDAGE_STEP = 10;

export interface CourseSearchResult {
    courseID: string;
    courseName: string;
    clubName: string;
    city: string;
    state: string;
}

export interface TeeData {
    name: string;
    par: number;
    rating: number;
    slope: number;
    holes: Array<{
        holeNumber: number;
        par: number;
        handicapIndex: number;
        yardage?: number;
    }>;
}

export interface CourseDetail {
    id: string;
    name: string;
    city: string;
    state: string;
    tees: TeeData[];
}

export async function searchCourses(query: string): Promise<CourseSearchResult[]> {
    const GOLF_API_KEY = process.env.GOLF_API_KEY;
    const GOLF_API_URL = process.env.GOLF_API_URL || 'https://api.golfapi.io';

    if (!GOLF_API_KEY) {
        // Mock data for development
        const mocks: CourseSearchResult[] = [
            { courseID: 'mock-1', courseName: 'Augusta National', clubName: 'Augusta National Golf Club', city: 'Augusta', state: 'GA' },
            { courseID: 'mock-2', courseName: 'Pebble Beach Golf Links', clubName: 'Pebble Beach Resorts', city: 'Pebble Beach', state: 'CA' },
            { courseID: 'mock-3', courseName: 'St Andrews Old Course', clubName: 'St Andrews Links', city: 'St Andrews', state: 'Scotland' },
            { courseID: 'mock-4', courseName: 'TPC Sawgrass (Stadium)', clubName: 'TPC Sawgrass', city: 'Ponte Vedra Beach', state: 'FL' },
        ];
        return mocks.filter(m => m.courseName.toLowerCase().includes(query.toLowerCase()) || m.clubName.toLowerCase().includes(query.toLowerCase()));
    }

    const response = await fetch(`${GOLF_API_URL}/clubs?q=${encodeURIComponent(query)}`, {
        headers: {
            'Authorization': `Bearer ${GOLF_API_KEY}`
        }
    });

    if (!response.ok) return [];

    interface ApiClub {
        clubName: string;
        city: string;
        state: string;
        courses?: ApiCourse[];
    }
    interface ApiCourse {
        courseID: string;
        courseName: string;
    }

    const data = await response.json() as { clubs?: ApiClub[] };
    // Transform golfapi.io response format
    const results: CourseSearchResult[] = [];
    data.clubs?.forEach((club: ApiClub) => {
        club.courses?.forEach((course: ApiCourse) => {
            results.push({
                courseID: course.courseID,
                courseName: course.courseName,
                clubName: club.clubName,
                city: club.city,
                state: club.state,
            });
        });
    });

    return results;
}

export async function getCourseDetails(courseID: string): Promise<CourseDetail | null> {
    const GOLF_API_KEY = process.env.GOLF_API_KEY;
    const GOLF_API_URL = process.env.GOLF_API_URL || 'https://api.golfapi.io';

    if (!GOLF_API_KEY || courseID.startsWith('mock-')) {
        // Mock details
        return {
            id: courseID,
            name: courseID === 'mock-1' ? 'Augusta National' : (courseID === 'mock-2' ? 'Pebble Beach' : 'Mock Course'),
            city: 'Sample City',
            state: 'SC',
            tees: [
                {
                    name: 'Championship',
                    par: DEFAULT_PAR,
                    rating: 74.5,
                    slope: 135,
                    holes: Array.from({ length: DEFAULT_HOLE_COUNT }, (_, i) => ({
                        holeNumber: i + 1,
                        par: MOCK_HOLE_PARS[i],
                        handicapIndex: i + 1,
                        yardage: MOCK_TEMP_BASE_YARDAGE + (i * YARDAGE_STEP)
                    }))
                },
                {
                    name: 'Member',
                    par: DEFAULT_PAR,
                    rating: 72.1,
                    slope: 128,
                    holes: Array.from({ length: DEFAULT_HOLE_COUNT }, (_, i) => ({
                        holeNumber: i + 1,
                        par: MOCK_HOLE_PARS[i],
                        handicapIndex: i + 1,
                        yardage: MOCK_MEMBER_BASE_YARDAGE + (i * YARDAGE_STEP)
                    }))
                }
            ]
        };
    }

    const response = await fetch(`${GOLF_API_URL}/courses/${courseID}`, {
        headers: {
            'Authorization': `Bearer ${GOLF_API_KEY}`
        }
    });

    if (!response.ok) return null;

    interface ApiTee {
        teeName: string;
        parMen?: number;
        courseRatingMen: string;
        slopeMen: string;
        [key: string]: string | number | undefined; // for the length1, length2 fields
    }

    const data = await response.json();

    // Transform golfapi.io course details
    return {
        id: data.courseID,
        name: data.courseName,
        city: data.city,
        state: data.state,
        tees: (data.tees as ApiTee[] | undefined)?.map((t: ApiTee) => ({
            name: t.teeName,
            par: t.parMen || DEFAULT_PAR, // Use men's par as default
            rating: parseFloat(t.courseRatingMen),
            slope: parseInt(t.slopeMen),
            holes: Array.from({ length: DEFAULT_HOLE_COUNT }, (_, i) => ({
                holeNumber: i + 1,
                par: data.parsMen ? data.parsMen[i] : (t.parMen || 4),
                handicapIndex: data.indexesMen ? data.indexesMen[i] : (i + 1),
                yardage: t[`length${i + 1}`] ? parseInt(String(t[`length${i + 1}`])) : undefined
            }))
        })) || []
    };
}
