const axios = require("axios")
const Chance = require('chance');
const chance = new Chance();
const cheerio = require("cheerio")
const fs = require('fs')

const url = 'https://truyenqqviet.com'

async function getTotalPages(url) {
    const $totalPages = cheerio.load((await axios.get(`${url}/truyen-moi-cap-nhat/trang-${1}.html`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
        }
    })).data)
    return parseInt($totalPages($totalPages('.page_redirect a')[6]).attr('href').replace(/\D/g, ''))
}

const nettruyenCrawler = async (url, fromPage, toPage) => {
    try {
        const totalPages = await getTotalPages(url)

        async function refetchStoryInfoLinks(page) {
            try {
                // Lấy danh sách link đến thông tin truyện
                const $page = cheerio.load(((await axios.get(`${url}/truyen-moi-cap-nhat/trang-${page}.html`, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
                    }
                }))).data)
                const storyInfoLinks = $page($page('#main_homepage div ul li .book_avatar a'))

                async function refetchStoryInfo(storyNumber, link) {
                    try {
                        const $storyInfo = cheerio.load(((await axios.get(`${url}${link}`, {
                            headers: {
                                'User-Agent': `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36`,
                            }
                        }))).data)

                        const storyName = $storyInfo($storyInfo('.book_info .book_other h1')[0]).text() // Tên truyện

                        try {
                            const path = `${process.cwd()}/truyenqqviet_2/${storyName}.json`
                            await fs.promises.access(path, fs.constants.F_OK)
                            const data = require(path)
                            data.link = url+link
                            await fs.promises.writeFile(path, JSON.stringify(data))
                            console.log(`Đã thêm link cho ${storyName}`);
                            return
                        } catch (error) {

                        }

                        const coverImageUrl = $storyInfo($storyInfo('.book_info .book_avatar img')[0]).attr('src') // link ảnh bìa
                        const description = $storyInfo($storyInfo('.story-detail-info p')[0]).text() // description

                        const chapterLinks = $storyInfo($storyInfo('.works-chapter-list .works-chapter-item div a'))
                        async function refetchChapterContent(chapterNumber, link) {
                            try {
                                const $chapterContent = cheerio.load(((await axios.get(`${url}${link}`, {
                                    headers: {
                                        'User-Agent': `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36`,
                                    }
                                }))).data)

                                const imageLinks = $chapterContent($chapterContent('.page-chapter img'))
                                let imageNumber = 1
                                const imageLinksTMP = []
                                for (let imageLink of imageLinks) {
                                    imageLinksTMP.push({
                                        order: imageNumber,
                                        image: $chapterContent(imageLink).attr('src')
                                    })
                                    ++imageNumber
                                }
                                return imageLinksTMP
                            } catch (error) {
                                return await refetchChapterContent(chapterNumber, link)
                            }
                        }
                        let chapterNumber = chapterLinks.length
                        const chapterTMP = []
                        for (let chapterLink of chapterLinks) {
                            const content = await refetchChapterContent(chapterNumber, $storyInfo(chapterLink).attr('href'))
                            chapterTMP.push({
                                order: chapterNumber,
                                name: $storyInfo(chapterLink).text(),
                                content
                            })
                            --chapterNumber
                        }

                        // Lưu lại trong file
                        const data = {
                            title: storyName,
                            coverImageUrl,
                            description,
                            link: url+link,
                            chapters: chapterTMP
                        }
                        console.log(data);
                        await fs.promises.writeFile(`${process.cwd()}/truyenqqviet_2/${storyName}.json`, JSON.stringify(data))
                    } catch (error) {
                        await refetchStoryInfo(storyNumber, link)
                    }
                }

                // Duyệt qua từng thông tin truyện
                let storyNumber = 1
                for (let storyInfoLink of storyInfoLinks) {
                    await refetchStoryInfo(storyNumber, $page(storyInfoLink).attr('href'))
                    ++storyNumber
                }

            } catch (error) {
                await refetchStoryInfoLinks(page)
            }
        }

        // Duyệt qua từng trang
        for (let page = fromPage; page <= toPage; ++page) {
            await refetchStoryInfoLinks(page)
        }
    } catch (error) {
        console.log(error);
    }
}

nettruyenCrawler(url, 11, 20)